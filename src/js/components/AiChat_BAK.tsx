import React, { useEffect, useRef, useState } from "react";
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import axios from "axios";
import ninegrid from "ninegrid2";

import '/public/css/aiChat.css';
//import * as dotenv from "dotenv";
import { ChatOpenAI } from '@langchain/openai';
import { BufferMemory } from "langchain/memory";
import { ConversationChain } from "langchain/chains";
import { loadSummarizationChain } from "langchain/chains";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";


//import { Ollama } from "langchain/llms/ollama";
//import { Ollama } from 'langchain/llms/ollama';
import { ChatOllama } from "@langchain/ollama";
import { Ollama } from "@langchain/ollama";
import { StringOutputParser } from "@langchain/core/output_parsers"
import {ChatPromptTemplate, PromptTemplate} from "@langchain/core/prompts"
//import danfojs-node from "danfojs-node";
//import { createStructuredOutputAgent } from "langchain/agents";
//const dfd = require("danfojs-node");

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
//import { HumanMessage } from "@langchain/core/messages";
import { QdrantVectorStore } from "@langchain/qdrant";
import { QdrantClient } from "@qdrant/js-client-rest";
//import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { OllamaEmbeddings } from "@langchain/ollama";

// Qdrant 클라이언트 생성



const AiChat: React.FC = () => {

	//const qdrant = null;//new QdrantClient({ url: "http://localhost:6333" });

	const qdrantClient = new QdrantClient({ url: "http://localhost:6333" });

	const setupQdrant = async () => {
		const collections = await qdrantClient.getCollections();
		const collectionNames = collections.collections.map(c => c.name);

		if (!collectionNames.includes("my_collection")) {
			await qdrantClient.createCollection("my_collection", {
				vectors: { size: 768, distance: "Cosine" }
			});

			console.log("✅ 컬렉션 생성 완료");
		} else {
			console.log("ℹ️ 컬렉션이 이미 존재합니다.");
		}
	};

	setupQdrant();


	const isJSON = (obj)=> {
		return obj instanceof Object && !Array.isArray(obj);
	}
	const parseResponse = (resp) => {

		console.log(resp);

		let respText;

		if (isJSON(resp)) {		//gemini
			respText = resp.text;
		}
		else {
			respText = resp;
		}

		if (respText.startsWith("```json")) {
			respText = respText.replace("```json", "");
			const idx = respText.indexOf("```");
			if (idx > 0) {
				respText = respText.substring(0, idx);
				console.log(respText.substring(idx+3));
			}
		}


		console.log(respText);

		//const parsed = JSON.parse(resp.content);
		return JSON.parse(respText);
	};

	const chunkContext = () => {

		let contexts = [];

		const data = document.querySelector("nine-grid").data.get();
		let lineContext = "";
		for (let o of data) {

			const line = `문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}\n`;

			if (line.length + lineContext.length > 1000) {

				contexts.push(lineContext);
				lineContext = line;
			}
			else {
				lineContext += line;
			}
		}

		contexts.push(lineContext);

		//console.log(contexts.length, contexts);

		return contexts;
	}
	const chunkContext2 = () => {

		let contexts = [];

		const title = `문서ID\t문서명\t매출액\t수정자\t수정일\n`;
		const data = document.querySelector("nine-grid").data.get();
		let lineContext = "";
		for (let o of data) {

			//const line = `문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}\n`;
			const line = `${o.doc_id}\t${o.doc_nm}\t${o.amt}\t${o.update_user}\t${o.update_dt}\n`;

			if (line.length + lineContext.length > 1000) {

				contexts.push(title + lineContext);
				lineContext = line;
			}
			else {
				lineContext += line;
			}
		}

		contexts.push(title + lineContext);

		//console.log(contexts.length, contexts);

		return contexts;
	}

	const extractJson = (arr, properties) => {

		try {


			console.log(arr, properties);

			if (!Array.isArray(properties)) {
				properties = properties?.split(",");
			}

			//console.log(properties);

			const extractJson2 = (arr, properties) => {

				if (!arr || typeof arr !== "object") return [];

				return Object.entries(arr)
					.flatMap(([key, value]) => {
						if (Array.isArray(value)) {
							return value.filter(item =>
								item && typeof item === "object" &&
								properties.every(prop => prop in item && item[prop] !== null) // ✅ `null` 값 필터링 추가
							);
						} else if (typeof value === "object") {
							return extractJson2(value, properties);
						} else {
							return properties.includes(key) ? [arr] : [];
						}
					});
			};

			//console.log(Array.isArray(arr) ? arr.flatMap(o => extractJson2(o, properties)) : extractJson2(arr, properties));
			return Array.isArray(arr) ? arr.flatMap(o => extractJson2(o, properties)) : extractJson2(arr, properties);
		} catch (e) {
			console.log(e);
			//ninegrid.alert(e);
			chatRef.current.add("ai", e);
			//ninegrid.alert(e, null, {"class": "rgb", "animation": "shake", });
		}
	};



	const aiSearch = async (question:string) => {

		try {

			/**
			const d = {
				amt: null,
				doc_id: 63,
				doc_nm: "aaa"
			}

			console.log(extractJson(d, "doc_id,doc_nm"));
			return;
				*/

			//const textQ = textAreaRef.current.value;

			if (question == "") return "";

			/**
			let listQuestion = [];

			//console.log("--------------");
			for (let context of chunkContext()) {

				const aa = `당신은 주어진 정보를 참고하여 답변하는 AI 입니다. 주어진 'context'를 바탕으로 'question'에 맞는 데이타를 찾아주세요. 라인별로 구분해서 찾으세요. 찾은 정보만 JSON 형식으로 알려줘. 예를 들어 { comment: 너의 의견, data: [ { doc_id: 1, doc_nm: "", amt: "", update_user: "", update_dt: "" } ] 이런 형식으로 보내줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${question}\n\ncontext:\n` + context;
				//console.log("==========", aa);
				listQuestion.push(aa);
				//listQuestion.push(`당신은 주어진 정보를 참고하여 답변하는 AI 입니다. 주어진 '정보'를 바탕으로 '질문'에 맞는 데이타를 찾아주세요. 만약, 관련문서가 없으면 '관련문서가 없습니다.'라고 답변하세요. 찾은 문서정보는 내가 보낸 형식 그대로 JSON 형식으로 알려줘. { data: JSON Array }}. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${question}\n\ncontext: ${context}`);
				//listQuestion.push(`당신은 주어진 정보를 참고하여 답변하는 AI 입니다. 주어진 'context'를 바탕으로 'question'에 맞는 데이타를 찾아주세요. 라인별로 구분해서 찾으세요. 찾은 정보만 JSON 형식으로 알려줘. 예를 들어 { comment: 너의 의견, data: [ { doc_id: 1, doc_nm: "", amt: "", update_user: "", update_dt: "" } ] 이런 형식으로 보내줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${question}\n\ncontext:\n` + context);
				//listQuestion.push(`당신은 주어진 정보를 참고하여 답변하는 AI 입니다. 주어진 'context'를 바탕으로 'question'에 맞는 데이타를 찾아주세요. 라인별로 구분해서 찾으세요. 찾은 정보만 JSON 형식으로 알려줘. 예를 들어 { comment: 너의 의견, data: [ { doc_id: 1, doc_nm: "", amt: "", update_user: "", update_dt: "" } ] 이런 형식으로 보내줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${question}\n\ncontext:\n` + context);
			}

			console.log(listQuestion);
			*/

			/**
			const prompt = PromptTemplate.fromTemplate(
				contextText
			)

			const chain = prompt
				.pipe(chatModel)
				.pipe(new StringOutputParser())
			*/

			let listData = [];

			for (let context of chunkContext2()) {
				//const q = `당신은 주어진 정보를 참고하여 답변하는 AI 입니다. 주어진 'context'를 바탕으로 'question'에 맞는 데이타를 찾아주세요. 반드시 모든 정보를 찾아야 합니다. 라인별로 구분해서 찾으세요. 찾은 정보만 JSON 형식으로 알려줘. 예를 들어 { comment: 너의 의견, data: [ { doc_id: 1, doc_nm: "", amt: "", update_user: "", update_dt: "" } ] 이런 형식으로 보내줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${question}\n\ncontext:\n${context}`;
				const q = `당신은 주어진 정보를 참고하여 답변하는 AI 입니다. 주어진 'context'를 바탕으로 'question'에 맞는 데이타를 찾아주세요. context는 csv형식이고 첫번째줄은 컬럼명이야. 반드시 모든 정보를 찾아야 합니다. 라인별로 구분해서 찾으세요. 찾은 정보만 JSON 형식으로 알려줘. 예를 들어 { comment: 너의 의견, data: [ { doc_id: 1, doc_nm: "", amt: "", update_user: "", update_dt: "" } ] 이런 형식으로 보내줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${question}\n\ncontext:\n${context}`;

				//console.log(q);

				//new HumanMessage
				const input = [
					new HumanMessage({
						content: [
							{
								type: "text",
								text: q,
							},
						],
					}),
				];
				let resp = await chatModel.invoke(input);
				//let resp = await chatModel.invoke(q);
				//let resp = await chatModel.invoke(new HumanMessage(q));

				const respJson = parseResponse(resp);

				//const parsed = JSON.parse(resp.content);
				//const parsed = JSON.parse(resp);
				//console.log(parsed);

				listData.push(...extractJson(respJson, "doc_id,doc_nm"));
			}


			return listData;
		} catch (e) {
			console.log(e);
			//ninegrid.alert(e);
			chatRef.current.add("ai", e);
			//ninegrid.alert(e, null, {"class": "rgb", "animation": "shake", });
		}

		return;
			/**
			for (let q of listQuestion) {
				const responses1 = await chatModel.invoke(q);
				console.log(responses1);
			} */
	/**
			try {
				const responses1 = await chatModel.batch(listQuestion);
				return responses1;
			} catch (error) {
				console.error("💥 오류 발생:", error);
				return [];
			} */

			/**
			model = ChatOpenAI(temperature=0)
			prompt = PromptTemplate(template="{query}")
			chain = prompt | model | StrOutputParser()

			response = chain.invoke({"query": "한국의 수도는?"})
			print(response)
			출처: https://rudaks.tistory.com/entry/langchain-StrOutputParser-JsonOutputParser-이해하기 [[루닥스 블로그] 연습만이 살길이다:티스토리]

			const tmpl = "Tell me a joke about {topic}."
			const prompt = ChatPromptTemplate.fromTemplate(tmpl)
			const chain = prompt.pipe(model)
			const response = await chain.invoke({ topic: "cat" })
			*/

			/**
			const prompt = ChatPromptTemplate.fromTemplate(listQuestion[0])
			const chain = prompt.pipe(chatModel);
			const rrr = await chain.invoke(listQuestion[0]);
			console.log(rrr);
			*/

			const responses = await chatModel.batch(listQuestion);


			responses.forEach((resp, index) => {

				console.log(resp);

				if (resp.startsWith("```json")) resp = resp.replace("```json", "");
				if (resp.endsWith("```")) resp = resp.replace("```", "");

				console.log(resp);

				//const parsed = JSON.parse(resp.content);
				const parsed = JSON.parse(resp);
				console.log(parsed);

				const a = extractJson(parsed, "doc_id,doc_nm");
				console.log(a);
				listData.push(...a);

				/**
				if (Array.isArray(parsed)) {
					listData.push(...parsed); // ✅ 배열이면 spread operator 적용
				} else {
					listData.push(parsed); // ✅ 배열이 아니면 그대로 추가
				} */
			});

			console.log("listData", listData);

			return listData;
	};


	//dotenv.config();
	let [messages, setMessages] = useState<string[]>([]);

	const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
	const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY;

	//console.log("::::::::", import.meta.env.VITE_OPENAI_API_KEY);
	//const chatModel = new ChatOpenAI({ model: 'gpt-3.5-turbo', apiKey });
	//const chatModel = new ChatOpenAI({ model: 'gpt-3.5-turbo', apiKey });
	//const chatModel = new ChatOpenAI({ model: 'gpt-3.5-turbo', apiKey });
	//const chatModel = new ChatOpenAI({ model: 'gpt-4', apiKey });
	//const chatModel = new ChatOpenAI({ model: 'gpt-3.5-turbo', apiKey });

	//const chatModel = new Ollama({ model: "deepseek-r1:8b" });
	//const chatModel = new Ollama({ model: "llama3.1:8b" });
	let chatModel = null;//new Ollama({ model: "phi4:14b" });
	//const chatModel = new Ollama({ model: "mistral:7b" });

	//console.log(ollama);

	//const chain = loadSummarizationChain(chatModel, { type: "refine" });
	//const chain = loadSummarizationChain(chatModel, { type: "map_reduce" });

	/**
	// ✅ 메모리 설정 (대화 컨텍스트 유지)
	const memory = new BufferMemory();
	const conversation = new ConversationChain({
		llm: chatModel,
		memory: memory,
	});
		*/

	useEffect(() => {
		console.log("📌 최신 messages 값:", messages);
	}, [messages]); // ✅ 상태 변경될 때마다 실행

	const textAreaRef = useRef<HTMLTextAreaElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const expandIconRef = useRef<HTMLDivElement>(null);
	const collapseIconRef = useRef<HTMLDivElement>(null);
	const chatDivRef = useRef<HTMLDivElement>(null);
	const menuFilterRef = useRef<HTMLDivElement>(null);
	const menuGeneralRef = useRef<HTMLDivElement>(null);
	const menuSettingRef = useRef<HTMLDivElement>(null);
	const settingsRef = useRef<HTMLDivElement>(null);
	const chatRef = useRef<HTMLDivElement>(null);




	let ing = false;

	const q_BAK = async () => {

		//console.log("===========")

		if (ing) return;

		ing = true;

		const textQ = textAreaRef.current.value;

		if (textQ == "") return;

		setMessages(prevMessages => [...prevMessages, { text: textQ, sender: "me" }]); // ✅ 최신 상태 기반으로 업데이트

		let listQ = [];

		const l = document.querySelector("nine-grid").data.get();

		//await conversation.call({ input: "이제부터 나는 '분석봇'이라고 불러줘." });
		//await conversation.call({ input: `내가 보내는 데이터는 회사의 매출 정보야. 분석 잘 해줘.\n\n` });
		//await conversation.call({ input: `내가 보내는 데이터는 회사의 매출 정보야. 분석 잘 해줘.\n\n${contextText}` });

		let contextText = "";

		contextText = `내가 보내는 데이타를 기반으로 데이타를 분석해줘. JSON 형식으로 응답해주고, { commnet: 너의 의견, count: 관련 문서 건수, context: JSON형식의 context } 형식에 맞추어서 답변해줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${textQ}\n\ncontext: `;
		//listQ.push(contextText);
		const query = `내가 보내는 데이타를 기반으로 데이타를 분석해줘. 한글로 답변해줘. JSON 형식으로 응답해주고, { commnet: 너의 의견, count: 관련 문서 건수, context: JSON형식의 context } 형식에 맞추어서 답변해줘.`;
		listQ.push(query);
		for (let i = 0; i < l.length; i++) {

			const o = l[i];
			contextText += `문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}`;
			//console.log(i % 50);
			listQ.push(`문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}\n`);

			if ((i != 0 && i % 80 == 0) || i == l.length - 1) {
				//listQ.push(`내가 보내는 데이타를 기반으로 데이타를 분석해줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${textQ}\n\ncontext: ${contextText}`);
				//listQ.push(`내가 보내는 데이타를 기반으로 데이타를 분석해줘. 찾은 문서의 문서ID는 배열로 보내줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${textQ}\n\ncontext: ${contextText}`);
				//console.log(i, contextText);
				//listQ.push(`내가 보내는 데이타를 기반으로 데이타를 분석해줘. JSON 형식으로 응답해주고, { commnet: 너의 의견, count: 관련 문서 건수, context: JSON형식의 context } 형식에 맞추어서 답변해줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${textQ}\n\ncontext: ${contextText}`);
				//listQ.push(`${contextText}`);

				//contextText = "";
			}
		}

		const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 }); //문서를 나누기 위한 spilitter 초기화
		const docs = await textSplitter.createDocuments(listQ);

		//const doc1 = new Document(contextText);
		console.log(docs);

		try {
			const res = await chain.invoke({
				input_documents: docs,
				//question: query,
			});

			console.log(res);
		} catch (error) {
			console.error("❌ 오류 발생:", error);
		}

		ing = false;
	};

	const q_count = async () => {

		if (ing) return;

		ing = true;

		const textQ = textAreaRef.current.value;

		if (textQ == "") return;

		setMessages(prevMessages => [...prevMessages, { text: textQ, sender: "me" }]); // ✅ 최신 상태 기반으로 업데이트

		let listQ = [];

		const l = document.querySelector("nine-grid").data.get();

		//await conversation.call({ input: "이제부터 나는 '분석봇'이라고 불러줘." });
		//await conversation.call({ input: `내가 보내는 데이터는 회사의 매출 정보야. 분석 잘 해줘.\n\n` });
		//await conversation.call({ input: `내가 보내는 데이터는 회사의 매출 정보야. 분석 잘 해줘.\n\n${contextText}` });

		let contextText = "";


		for (let i = 0; i < l.length; i++) {

			const o = l[i];
			contextText += `문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}`;
			//console.log(i % 50);
			//listQ.push(`문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}\n`);

			if ((i != 0 && i % 800 == 0) || i == l.length - 1) {
				//console.log(contextText);
				listQ.push(`당신은 주어진 정보를 참고하여 답변하는 AI 입니다. 주어진 '정보'를 바탕으로 '질문'에 맞는 데이타를 찾아주세요. 데이타의 key는 "doc_id"이고, 관련된 "doc_id"를 알려줘. 만약, 관련문서가 없으면 '관련문서가 없습니다.'라고 답변하세요. 찾은 문서 ID를 배열로 보내줘. 답변내용은 { "comment": "너의 의견", "data": { "doc_id": "문서ID", "doc_nm": "문서명"} } 형식으로 보내줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${textQ}\n\ncontext: ${contextText}`);
				//listQ.push(`내가 보내는 데이타를 기반으로 데이타를 찾아줘. 찾은 문서 ID를 배열로 보내줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${textQ}\n\ncontext: ${contextText}`);
			}
		}

		//const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 }); //문서를 나누기 위한 spilitter 초기화
		//const docs = await textSplitter.createDocuments(listQ);

		//const doc1 = new Document(contextText);
		//console.log(docs);

		//console.log(listQ)

		const responses = await chatModel.batch(listQ);

		let keys = [];
		responses.forEach((resp, index) => {
			//console.log(resp.content);

			const parsed = JSON.parse(resp.content);
			console.log(parsed);

			if (Array.isArray(parsed.data)) {
				keys.push(...parsed.data); // ✅ 배열이면 spread operator 적용
			} else {
				keys.push(parsed.data); // ✅ 배열이 아니면 그대로 추가
			}
		});

		console.log("keys", keys, keys.length);

		const aiMsg = keys.length > 0 ? `문서를 ${keys.length}건 찾았습니다.` : "관련된 문서가 없습니다.";
		setMessages(prevMessages => [...prevMessages, { text: aiMsg, sender: "ai", data: keys, }]); // ✅ 최신 상태 기반으로 업데이트

		ing = false;
	};

	/**
	 * const model = new ChatGoogleGenerativeAI({
	 *    modelName: "gemini-pro",
	 *    maxOutputTokens: 2048,
	 * });
	 * const response = await model.invoke(new HumanMessage("Hello world!"));
	 */

	const q = async () => {

		//chatRef.current.add("ai", "관련된 정보가 없습니다.", [{doc_id:1,doc_nm:"test"},{doc_id:2,doc_nm:"test2"}]);
		//return;
		const question = textAreaRef.current.value.trim();
		if (!question) return;


		if (ing) return;
		ing = true;




		/** setTimeout 없으면, 맥에서 한글 잔상이 남음 */
		setTimeout(() => {
			textAreaRef.current.value = "";
		});

		chatRef.current.add("me", question);
		chatRef.current.add("ing", question);
		//chatRef.current.add("ai", "dasdf sfs afsf sdf saf dsfdsafdasfdsafsdfsfadsafas dasdf sfs afsf sdf saf dsfdsafdasfdsafsdfsfadsafas dasdf sfs afsf sdf saf dsfdsafdasfdsafsdfsfadsafas", []);
		/**
		setMessages(prevMessages => [...prevMessages, {text: question, sender: "me", data: null }]);
		//setMessages(prevMessages => [...prevMessages, { text: "...", sender: "ing", data: null }]);

		setMessages(prevMessages => [...prevMessages, { text: "dasdf sfs afsf sdf saf dsfdsafdasfdsafsdfsfadsafas dasdf sfs afsf sdf saf dsfdsafdasfdsafsdfsfadsafas dasdf sfs afsf sdf saf dsfdsafdasfdsafsdfsfadsafas", sender: "ai", data: null }]);
		setMessages(prevMessages => [...prevMessages, { text: "s afsf sdf saf", sender: "ai", data: null }]);
		*/
		//return;

		const arrContext : any[] = await aiSearch(question);

		console.log(arrContext);

		if (arrContext) {
			if (arrContext.length < 1) {
				chatRef.current.add("ai", "관련된 정보가 없습니다.");
			}
			else {
				let contextText = `당신은 주어진 정보를 참고하여 답변하는 AI 입니다. 주어진 '정보'를 바탕으로 데이타를 분석해줘. 데이타는 "context" 항목에 있어. 이전에 너가 찾아준 데이타를 다시 보내는거니깐 첫 줄에는 "${arrContext.length}건을 찾았습니다." 라고 답변을 달아줘.\n\ncontext: `;
				for (const o of arrContext) {
					console.log(o);
					contextText += `문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}\n`;
					//contextText += JSON.stringify(o) + "\n";
					//contextText += o + "\n";//JSON.stringify(o) + "\n";//`문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}\n`;
				}

				console.log(arrContext);

				const prompt = PromptTemplate.fromTemplate(
					contextText
				)

				const chain = prompt
					.pipe(chatModel)
					.pipe(new StringOutputParser())

				const result = await chain.invoke();
				//console.log(result)

				/**
				 setMessages(prevMessages =>
				 prevMessages[prevMessages.length - 1]?.sender === "ing"
				 ? prevMessages.slice(0, -1)
				 : prevMessages
				 );
				 setMessages(prevMessages => [...prevMessages, { text: result, sender: "ai", data: arrContext.map(({ doc_id, doc_nm }) => ({ doc_id, doc_nm })), }]);
				 */
				//chatRef.current.add("ai", result, arrContext.map(({ doc_id, doc_nm }) => ({ doc_id, doc_nm })));
				const grd = document.querySelector("nine-grid");
				chatRef.current.add("ai", result, grd.columns.info(), arrContext);
			}

		}

		ing = false;
	};


	const generateVector = async () => {
		const embeddings = new OllamaEmbeddings({ model: "nomic-embed-text" });

		const jsonData = document.querySelector("nine-grid").data.get();


		jsonData.forEach((item, index) => {
			embeddings.embedQuery(JSON.stringify(item))
				.then(vector => {
					return qdrantClient.upsert("my_collection", {
						points: [{ id: index + 1, vector, payload: item }]
					});
				})
				.then(() => {
					console.log(`✅ 데이터 업서트 완료: ID ${index + 1}`);
				})
				.catch(error => {
					console.error(`❌ 오류 발생 (ID ${index + 1}):`, error);
				});
		});
	}

	const generateFilter = async (query) => {
		const prompt = `다음 질문을 기반으로 Qdrant 필터를 JSON 형식으로 생성해줘: "${query}"`;

		const response = await chatModel.invoke(prompt);
		//const filterJson = JSON.parse(response.text());
		console.log(response);

		return null;
	}

	const generateQdrantFilter= async (userInput) => {

		//console.log(document.querySelector("nine-grid").body.querySelector(`thead [data-col="6"]`));
		//console.log(document.querySelector("nine-grid").columns.info());

		let colInfo = "";
		document.querySelector("nine-grid").columns.info().forEach(info => {
			colInfo += `- "${info.name}": ${info.desc}, ${info.type}\n`;
		});

		//console.log(colInfo);

		// Qdrant 필터로 변환하기 위한 프롬프트 엔지니어링
		// 중요: 실제 컬렉션의 payload 필드와 그 데이터 타입을 정확히 알려줘야 Gemini가 올바른 필터를 생성합니다.
		const prompt = `
			자연어 쿼리를 Qdrant 필터 JSON 객체로 변환하는 AI 비서입니다.

			Qdrant 컬렉션에서 사용 가능한 메타데이터 필드와 유형은 다음과 같습니다.:
			${colInfo}

			필터 생성 규칙:
			1. 위에 제공된 필드만 사용하십시오. 새로운 필드를 만들지 마십시오.
			2. 조건이 명확하게 지정되지 않았거나 모호한 경우 필터에 포함하지 마십시오.
			3. AND 조건에는 'must', OR 조건에는 'should', NOT 조건에는 'must_not'을 사용하십시오.
			4. 문자열 일치에는 'match.text'를 사용하십시오.
			5. 숫자 범위에는 'range.gte', 'range.lte', 'range.gt', 'range.lt'를 사용하십시오.
			6. 특정 값을 포함하는 배열에는 'contains', 'match.any' 또는 'match.all'을 사용하십시오.
			7. 출력은 Qdrant 필터를 나타내는 유효한 JSON 객체여야 합니다.
			8. 적용 가능한 필터가 없는 경우 빈 JSON 객체인 {}를 반환합니다.
			
			예:
			- "500달러 미만의 전자제품 찾기" -> {"must": [{"key": "category", "match": {"text": "electronics"}}, {"key": "price", "range": {"lt": 500}}]}
			- "John Doe 또는 Jane Smith의 책 보기" -> {"should": [{"key": "author", "match": {"text": "John Doe"}}, {"key": "author", "match": {"text": "Jane Smith"}}]}
			- "재고 있는 품목(의류 제외)" -> {"must": [{"key": "in_stock", "match": {"text": true}}], "must_not": [{"key": "category", "match": {"text": "clothing"}}]}
			- "다음이 포함된 제품 'new_arrival' 태그" -> {"must": [{"key": "tags", "match": {"text": "new_arrival"}}]}
			- "2020년 이후 출판된 도서" -> {"must": [{"key": "published_year", "range": {"gt": 2020}}]}
			
			이제 다음 사용자 쿼리를 변환해 보겠습니다.
			사용자 쿼리: "${userInput}"
			
			Qdrant 필터 JSON:
		`;

		try {
			const response = await chatModel.invoke([
				new SystemMessage("You are a helpful assistant."),
				new HumanMessage(prompt),
			]);

			let filterString = response.content.trim();
			if (filterString.startsWith("```json")) {
				filterString = filterString.replace("```json", "");
				const idx = filterString.indexOf("```");
				if (idx > 0) {
					filterString = filterString.substring(0, idx);
					//console.log(filterString.substring(idx+3));
				}
			}
			//filterString = filterString.replaceAll('"value"', '"text"')
			console.log("Generated Filter String:", filterString);

			// Gemini가 JSON 모드나 Structured Output을 지원하지 않는 경우, 직접 파싱 시도
			// 안정적인 JSON 파싱을 위해 'JSON Mode' 또는 Function Calling 사용을 강력히 권장
			// LangChain의 SelfQueryRetriever를 사용하면 이 부분을 자동화할 수 있습니다.
			try {
				return JSON.parse(filterString);
			} catch (parseError) {
				console.error("Failed to parse filter string as JSON:", parseError);
				console.error("String that failed to parse:", filterString);
				return null; // 파싱 실패 시 null 반환 또는 적절한 에러 처리
			}

		} catch (error) {
			console.error("Error generating Qdrant filter with Gemini:", error);
			return null;
		}
	}

	/**
	 * Qdrant에서 필터를 사용하여 검색을 수행합니다.
	 * @param {string} collectionName 검색할 컬렉션 이름
	 * @param {string} queryText 사용자의 원본 쿼리 (임베딩 생성용)
	 * @param {object | null} filter Qdrant 필터 객체
	 * @returns {Promise<Array>} 검색 결과 배열
	 */
	const searchWithQdrantFilter = async (collectionName, queryText, filter) => {
		try {
			// 쿼리 텍스트를 임베딩으로 변환 (Gemini Embedding 모델 사용)
			// LangChain의 Embeddings 클래스 또는 @google/generative-ai SDK 직접 사용 가능
			// 여기서는 예시를 위해 임시로 더미 벡터를 사용합니다.
			// 실제로는 GoogleGenerativeAI.embedContent 등을 사용해야 합니다.
			// const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
			// const embeddingModel = genAI.get  GenerativeModel({ model: "embedding-001" });
			// const { embedding } = await embeddingModel.embedContent({
			//     content: queryText,
			//     taskType: "retrieval_query",
			// });
			//const queryVector = [0.1, 0.2, 0.3, 0.4, ...Array(764).fill(0)]; // 실제 임베딩 벡터로 대체
			const embeddings = new OllamaEmbeddings({ model: "nomic-embed-text" });
			const queryVector = await embeddings.embedQuery(queryText);


			console.log(collectionName, filter);

			const searchParams = {
				vector: queryVector,
				limit: 500, // 검색 결과 수
				filter: filter, // Gemini가 생성한 필터 적용
				with_payload: true, // 페이로드도 함께 가져오도록 설정
			};

			//console.log("Qdrant Search Params:", JSON.stringify(searchParams, null, 2));

			const searchResult = await qdrantClient.search(collectionName, searchParams);
			return searchResult;

		} catch (error) {
			console.error("Error during Qdrant search:", error);
			return [];
		}
	}


	const q2 = async () => {

		/**
		let agency_code = ["1111060000","1111065000","1111061500","1111056000","1111058000","1111069000","1111051500","1111067000","1111068000","1111063000","1111055000","1111070000","1111064000","1111053000","1111057000","1111071000","1111054000"];
		agency_code = agency_code.sort();

		console.log(agency_code);

		const g = document.querySelector("nine-grid");
		g.filtering.set({
			"agency_code" : agency_code,
			"reference_month" : ['2025-03-31','2025-04-30',],
		});

		return;
			*/

		//chatRef.current.add("ai", "관련된 정보가 없습니다.", [{doc_id:1,doc_nm:"test"},{doc_id:2,doc_nm:"test2"}]);
		//return;
		const question = textAreaRef.current.value.trim();
		if (!question) return;

		if (ing) return;
		ing = true;

		/** setTimeout 없으면, 맥에서 한글 잔상이 남음 */
		setTimeout(() => {
			textAreaRef.current.value = "";
		});

		chatRef.current.add("me", question);
		chatRef.current.add("ing", question);

		/**
		 * generate vector data
		 */
		//generateVector();

		/**
		const input = [
				new HumanMessage({
					content: [
						{
							type: "text",
							text: question + "\n\n에 해당하는 Qdrant",
						},
					],
				}),
			];
		let resp = await chatModel.invoke(input);

		console.log(resp);
		*/

		const isEmptyJson = (obj) => {
			return Object.keys(obj).length === 0 && obj.constructor === Object;
		};

		//const filter = generateQdrantFilter(question);
		const qdrantFilter = await generateQdrantFilter(question);
		let searchResults;

		if (qdrantFilter && !isEmptyJson(qdrantFilter)) {
			/**
			 const embeddings = new OllamaEmbeddings({ model: "nomic-embed-text" });
			 const queryVector = await embeddings.embedQuery(question);

			 const results = await qdrantClient.search("my_collection", {
			 vector: queryVector,
			 limit: 20,
			 filter: filter,
			 });

			 console.log("🔍 검색 결과:", results);
			 */
			console.log("\nSuccessfully generated Qdrant filter:");
			console.log(JSON.stringify(qdrantFilter, null, 2));

			searchResults = await searchWithQdrantFilter("my_collection", question, qdrantFilter);
			console.log("\nQdrant Search Results:", searchResults);

		}
		else {
			//console.log("\nCould not generate a valid Qdrant filter. Performing search without filter.");
			// 필터 생성에 실패한 경우, 필터 없이 일반 검색 수행 또는 사용자에게 재입력 요청
			//searchResults = await searchWithQdrantFilter("my_collection", question, null);
			//console.log("\nQdrant Search Results (without filter):", searchResults);
		}



		const grd = document.querySelector("nine-grid");

		if (!searchResults || searchResults.length == 0) {
			chatRef.current.add("ai", "관련된 정보가 없습니다.");
		}
		else if (searchResults.length > 100) {
			chatRef.current.add("ai", `${searchResults.length}건의 정보를 찾았습니다.`, grd.columns.info(), searchResults.map(item => item.payload), grd.dataset.unique);
		}
		else {
			let arr = searchResults.map(item => item.payload);
			let contextText = `당신은 주어진 정보를 참고하여 답변하는 AI 입니다. 주어진 '정보'를 바탕으로 데이타를 분석해줘. 데이타는 "context" 항목에 있어. 제공될 데이터는 CSV 형식이며, 첫 번째 줄은 컬럼명입니다. 이전에 너가 찾아준 데이타를 다시 보내는거니깐 첫 줄에는 "${arr.length}건을 찾았습니다." 라고 답변을 달아줘.\n\ncontext: `;

			let contextText1 = `당신은 주어진 데이터를 분석하고 핵심 인사이트를 도출하는 전문 데이터 분석가입니다.

				아래에 제공될 데이터는 CSV 형식이며, 첫 번째 줄은 컬럼명입니다.

				이 데이터를 철저히 분석하여 다음 질문에 대한 답변을 제공해주세요:
				- 데이터의 주요 트렌드는 무엇인가요?
				- 특이하거나 주목할 만한 패턴이 있나요?
				- 가장 빈번하게 나타나는 항목(또는 값)은 무엇인가요?
				- 데이터에서 발견할 수 있는 잠재적인 문제점이나 개선점은 무엇인가요?
				- 각 데이터 레코드를 기반으로 한 간략한 요약 또는 분류가 가능할까요?

				분석 결과는 다음 형식으로 제공해주세요:
				1.  **주요 트렌드**: 불릿 포인트 형식으로 요약
				2.  **주목할 만한 패턴/이상치**: 구체적인 예시와 함께 설명
				3.  **가장 빈번한 항목**: 항목명과 빈도수를 포함 (테이블 형식도 가능)
				4.  **개선점/문제점**: 텍스트 설명
				5.  **각 레코드에 대한 간략한 요약 또는 분류**: (선택 사항, 필요시)

				context:\n`;

			grd.columns.info().forEach(info => {
				contextText += `${info.desc}\t`;
			});
			contextText += "\n";

			for (const o of arr) {
				grd.columns.info().forEach(info => {
					contextText += `${o[info.name]}\t`;
				});

				contextText += "\n";
				//contextText += `문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}\n`;
			}

			//console.log(contextText);

			const prompt = PromptTemplate.fromTemplate(
				contextText
			)

			const chain = prompt
				.pipe(chatModel)
				.pipe(new StringOutputParser())

			const result = await chain.invoke();

			chatRef.current.add("ai", result, grd.columns.info(), arr, grd.dataset.unique);
		}




		/**
		const arrContext : any[] = await aiSearch(question);

		console.log(arrContext);

		if (arrContext) {
			if (arrContext.length < 1) {
				chatRef.current.add("ai", "관련된 정보가 없습니다.", arrContext);
			}
			else {
				let contextText = `당신은 주어진 정보를 참고하여 답변하는 AI 입니다. 주어진 '정보'를 바탕으로 데이타를 분석해줘. 데이타는 "context" 항목에 있어. 이전에 너가 찾아준 데이타를 다시 보내는거니깐 첫 줄에는 "${arrContext.length}건을 찾았습니다." 라고 답변을 달아줘.\n\ncontext: `;
				for (const o of arrContext) {
					console.log(o);
					contextText += `문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}\n`;
				}

				console.log(arrContext);

				const prompt = PromptTemplate.fromTemplate(
					contextText
				)

				const chain = prompt
					.pipe(chatModel)
					.pipe(new StringOutputParser())

				const result = await chain.invoke();

				chatRef.current.add("ai", result, arrContext);
			}

		}
		*/


		ing = false;
	};

	const q3 = async () => {

		/**
		 let agency_code = ["1111060000","1111065000","1111061500","1111056000","1111058000","1111069000","1111051500","1111067000","1111068000","1111063000","1111055000","1111070000","1111064000","1111053000","1111057000","1111071000","1111054000"];
		 agency_code = agency_code.sort();

		 console.log(agency_code);

		 const g = document.querySelector("nine-grid");
		 g.filtering.set({
		 "agency_code" : agency_code,
		 "reference_month" : ['2025-03-31','2025-04-30',],
		 });

		 return;
		 */

			//chatRef.current.add("ai", "관련된 정보가 없습니다.", [{doc_id:1,doc_nm:"test"},{doc_id:2,doc_nm:"test2"}]);
			//return;
		const question = textAreaRef.current.value.trim();
		if (!question) return;

		if (ing) return;
		ing = true;

		/** setTimeout 없으면, 맥에서 한글 잔상이 남음 */
		setTimeout(() => {
			textAreaRef.current.value = "";
		});

		chatRef.current.add("me", question);
		chatRef.current.add("ing", question);

		/**
		 * generate vector data
		 */
		//generateVector();

		/**
		 const input = [
		 new HumanMessage({
		 content: [
		 {
		 type: "text",
		 text: question + "\n\n에 해당하는 Qdrant",
		 },
		 ],
		 }),
		 ];
		 let resp = await chatModel.invoke(input);

		 console.log(resp);
		 */

		const isEmptyJson = (obj) => {
			return Object.keys(obj).length === 0 && obj.constructor === Object;
		};

		//const filter = generateQdrantFilter(question);
		const qdrantFilter = await generateQdrantFilter(question);
		let searchResults;

		if (qdrantFilter && !isEmptyJson(qdrantFilter)) {
			/**
			 const embeddings = new OllamaEmbeddings({ model: "nomic-embed-text" });
			 const queryVector = await embeddings.embedQuery(question);

			 const results = await qdrantClient.search("my_collection", {
			 vector: queryVector,
			 limit: 20,
			 filter: filter,
			 });

			 console.log("🔍 검색 결과:", results);
			 */
			console.log("\nSuccessfully generated Qdrant filter:");
			console.log(JSON.stringify(qdrantFilter, null, 2));

			searchResults = await searchWithQdrantFilter("my_collection", question, qdrantFilter);
			console.log("\nQdrant Search Results:", searchResults);

		}
		else {
			//console.log("\nCould not generate a valid Qdrant filter. Performing search without filter.");
			// 필터 생성에 실패한 경우, 필터 없이 일반 검색 수행 또는 사용자에게 재입력 요청
			//searchResults = await searchWithQdrantFilter("my_collection", question, null);
			//console.log("\nQdrant Search Results (without filter):", searchResults);
		}



		const grd = document.querySelector("nine-grid");

		if (!searchResults || searchResults.length == 0) {
			chatRef.current.add("ai", "관련된 정보가 없습니다.");
		}
		else if (searchResults.length > 100) {
			chatRef.current.add("ai", `${searchResults.length}건의 정보를 찾았습니다.`, grd.columns.info(), searchResults.map(item => item.payload), grd.dataset.unique);
		}
		else {
			let arr = searchResults.map(item => item.payload);
			let contextText = `당신은 주어진 정보를 참고하여 답변하는 AI 입니다. 주어진 '정보'를 바탕으로 데이타를 분석해줘. 데이타는 "context" 항목에 있어. 제공될 데이터는 CSV 형식이며, 첫 번째 줄은 컬럼명입니다. 이전에 너가 찾아준 데이타를 다시 보내는거니깐 첫 줄에는 "${arr.length}건을 찾았습니다." 라고 답변을 달아줘.\n\ncontext: `;

			let contextText1 = `당신은 주어진 데이터를 분석하고 핵심 인사이트를 도출하는 전문 데이터 분석가입니다.

				아래에 제공될 데이터는 CSV 형식이며, 첫 번째 줄은 컬럼명입니다.

				이 데이터를 철저히 분석하여 다음 질문에 대한 답변을 제공해주세요:
				- 데이터의 주요 트렌드는 무엇인가요?
				- 특이하거나 주목할 만한 패턴이 있나요?
				- 가장 빈번하게 나타나는 항목(또는 값)은 무엇인가요?
				- 데이터에서 발견할 수 있는 잠재적인 문제점이나 개선점은 무엇인가요?
				- 각 데이터 레코드를 기반으로 한 간략한 요약 또는 분류가 가능할까요?

				분석 결과는 다음 형식으로 제공해주세요:
				1.  **주요 트렌드**: 불릿 포인트 형식으로 요약
				2.  **주목할 만한 패턴/이상치**: 구체적인 예시와 함께 설명
				3.  **가장 빈번한 항목**: 항목명과 빈도수를 포함 (테이블 형식도 가능)
				4.  **개선점/문제점**: 텍스트 설명
				5.  **각 레코드에 대한 간략한 요약 또는 분류**: (선택 사항, 필요시)

				context:\n`;

			grd.columns.info().forEach(info => {
				contextText += `${info.desc}\t`;
			});
			contextText += "\n";

			for (const o of arr) {
				grd.columns.info().forEach(info => {
					contextText += `${o[info.name]}\t`;
				});

				contextText += "\n";
				//contextText += `문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}\n`;
			}

			//console.log(contextText);

			const prompt = PromptTemplate.fromTemplate(
				contextText
			)

			const chain = prompt
				.pipe(chatModel)
				.pipe(new StringOutputParser())

			const result = await chain.invoke();

			chatRef.current.add("ai", result, grd.columns.info(), arr, grd.dataset.unique);
		}




		/**
		 const arrContext : any[] = await aiSearch(question);

		 console.log(arrContext);

		 if (arrContext) {
		 if (arrContext.length < 1) {
		 chatRef.current.add("ai", "관련된 정보가 없습니다.", arrContext);
		 }
		 else {
		 let contextText = `당신은 주어진 정보를 참고하여 답변하는 AI 입니다. 주어진 '정보'를 바탕으로 데이타를 분석해줘. 데이타는 "context" 항목에 있어. 이전에 너가 찾아준 데이타를 다시 보내는거니깐 첫 줄에는 "${arrContext.length}건을 찾았습니다." 라고 답변을 달아줘.\n\ncontext: `;
		 for (const o of arrContext) {
		 console.log(o);
		 contextText += `문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}\n`;
		 }

		 console.log(arrContext);

		 const prompt = PromptTemplate.fromTemplate(
		 contextText
		 )

		 const chain = prompt
		 .pipe(chatModel)
		 .pipe(new StringOutputParser())

		 const result = await chain.invoke();

		 chatRef.current.add("ai", result, arrContext);
		 }

		 }
		 */


		ing = false;
	};

	const q_1 = async () => {

		if (ing) return;

		ing = true;

		const textQ = textAreaRef.current.value;

		if (textQ == "") return;

		setMessages(prevMessages => [...prevMessages, {text: textQ, sender: "me"}]); // ✅ 최신 상태 기반으로 업데이트

		let listQ = [];

		const l = document.querySelector("nine-grid").data.get();


		let contextText = "";


		for (let i = 0; i < l.length; i++) {

			const o = l[i];
			contextText += `문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}`;
			//console.log(i % 50);
			//listQ.push(`문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}\n`);

			if ((i != 0 && i % 80 == 0) || i == l.length - 1) {
				//console.log(contextText);
				listQ.push(`당신은 주어진 정보를 참고하여 답변하는 AI 입니다. 주어진 '정보'를 바탕으로 '질문'에 한글로 답변하세요. 만약, 관련문서가 없으면 '관련문서가 없습니다.'라고 답변하세요. 찾은 문서 ID를 배열로 보내줘. 답변내용은 { "comment": "너의 의견", "doc_id": "문서ID" } 형식으로 보내줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${textQ}\n\ncontext: ${contextText}`);
				//listQ.push(`내가 보내는 데이타를 기반으로 데이타를 찾아줘. 찾은 문서 ID를 배열로 보내줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${textQ}\n\ncontext: ${contextText}`);
			}
		}

		console.log(listQ.length);

		const responses = await ollama.batch(listQ);



		let keys = [];
		responses.forEach((resp, index) => {
			console.log(resp);
			/**
			const parsed = JSON.parse(resp.content);
			//console.log(parsed);
			if (Array.isArray(parsed.doc_id)) {
				keys.push(...parsed.doc_id); // ✅ 배열이면 spread operator 적용
			} else {
				keys.push(parsed.doc_id); // ✅ 배열이 아니면 그대로 추가
			} */
		});

		/**
		 // ✅ Ollama 모델 설정
		 const model = new Ollama({ model: "deepseek-r1:8b" });
		 console.log(model);
		 //const result = await model.invoke(["human", "Hello, how are you?"]);
		 const result = await model.invoke("Hello, how are you?");
		 console.log(result);
		 */


		const result = await ollama.invoke(["human", "Hello, how are you?"]);
		//const result = await model.invoke("Hello, how are you?");
		console.log(result);
		/**
		const OLLAMA_API_URL = "http://localhost:11434/api/generate";
		const model = "deepseek-r1:8b";
		const prompt = "하이";

		try {
			const response = await axios.post(
				OLLAMA_API_URL,
				{
					"model" : model,
					"prompt" : prompt,
				},
				{
					headers: {"Content-Type": "application/json"}, // ✅ JSON 헤더 추가
				}
			);

			console.log("Ollama 응답:", response.data);
		} catch (error) {
			console.error("Ollama 실행 오류:", error);
		}
		*/


		//runOllama("안녕하세요! 오늘의 뉴스 요약을 해줘.", "deepseek-r1");

// ✅ 질문 실행
		//async function askOllama() {
			//const response = await llm.call("오늘의 날씨를 알려줘.");
			//console.log("🚀 Ollama 응답:", response);
		//}

		ing = false;
	};


	const q_map_reduce = async () => {

		if (ing) return;

		ing = true;

		const textQ = textAreaRef.current.value;

		if (textQ == "") return;

		setMessages(prevMessages => [...prevMessages, { text: textQ, sender: "me" }]); // ✅ 최신 상태 기반으로 업데이트

		let listQ = [];

		const l = document.querySelector("nine-grid").data.get();

		//await conversation.call({ input: "이제부터 나는 '분석봇'이라고 불러줘." });
		//await conversation.call({ input: `내가 보내는 데이터는 회사의 매출 정보야. 분석 잘 해줘.\n\n` });
		//await conversation.call({ input: `내가 보내는 데이터는 회사의 매출 정보야. 분석 잘 해줘.\n\n${contextText}` });

		let contextText = "";

		//listQ.push(`당신은 주어진 정보를 참고하여 답변하는 AI 입니다. 주어진 '정보'를 바탕으로 '질문'에 맞는 데이타를 찾아주세요. 답변은 한글로 해주세요. 데이타의 key는 "doc_id"이고, 관련된 "doc_id"를 알려줘. 만약, 관련문서가 없으면 '관련문서가 없습니다.'라고 답변하세요. 찾은 문서 ID를 배열로 보내줘. 답변내용은 { "comment": "너의 의견", "data": { "doc_id": "문서ID", "doc_nm": "문서명"} } 형식으로 보내줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${textQ}\n\ncontext: `);

		for (let i = 0; i < l.length; i++) {

			const o = l[i];
			contextText += `문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}`;
			//console.log(i % 50);
			//listQ.push(`문서ID: ${o.doc_id}, 문서명: ${o.doc_nm}, 매출액: ${o.amt}, 수정자: ${o.update_user}, 수정일: ${o.update_dt}\n`);

			if ((i != 0 && i % 800 == 0) || i == l.length - 1) {
				//listQ.push(contextText);



				//console.log(contextText);
				listQ.push(`당신은 주어진 정보를 참고하여 답변하는 AI 입니다. 주어진 '정보'를 바탕으로 '질문'에 맞는 데이타를 찾아주세요. 답변은 한글로 해주세요. 데이타의 key는 "doc_id"이고, 관련된 "doc_id"를 알려줘. 만약, 관련문서가 없으면 '관련문서가 없습니다.'라고 답변하세요. 찾은 문서 ID를 배열로 보내줘. 답변내용은 { "comment": "너의 의견", "data": { "doc_id": "문서ID", "doc_nm": "문서명"} } 형식으로 보내줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${textQ}\n\ncontext: ${contextText}`);
				//listQ.push(`내가 보내는 데이타를 기반으로 데이타를 찾아줘. 찾은 문서 ID를 배열로 보내줘. 질문내용은 "question" 항목이고 데이타는 "context" 항목에 있어.\n\nquestion: ${textQ}\n\ncontext: ${contextText}`);

				contextText = "";
			}
		}

		const chain = loadSummarizationChain(chatModel, { type: "map_reduce" }); //mapReduce방법을 사용하는 loadSummarizationChain 초기화

		const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 }); //문서를 나누기 위한 spilitter 초기화
		//const docs = await textSplitter.createDocuments(listQ);
		const docs = await textSplitter.createDocuments(listQ);

		const res = await chain.invoke({
			input_documents: docs,
		}); //chain 사용

		console.log({ res });

		//const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 }); //문서를 나누기 위한 spilitter 초기화
		//const docs = await textSplitter.createDocuments(listQ);

		//const doc1 = new Document(contextText);
		//console.log(docs);

		//console.log(listQ)

		/**
		const responses = await chatModel.batch(listQ);

		let keys = [];
		responses.forEach((resp, index) => {
			//console.log(resp.content);

			const parsed = JSON.parse(resp.content);
			console.log(parsed);

			if (Array.isArray(parsed.data)) {
				keys.push(...parsed.data); // ✅ 배열이면 spread operator 적용
			} else {
				keys.push(parsed.data); // ✅ 배열이 아니면 그대로 추가
			}
		});

		console.log("keys", keys);

		const aiMsg = keys.length > 0 ? `문서를 ${keys.length}건 찾았습니다.` : "관련된 문서가 없습니다.";
		setMessages(prevMessages => [...prevMessages, { text: aiMsg, sender: "ai", data: keys, }]); // ✅ 최신 상태 기반으로 업데이트
		*/



		ing = false;
	};

	const changeModel = () => {
		switch (settingsRef.current.server) {
			case "gemini":
				chatModel = new ChatGoogleGenerativeAI({ model: settingsRef.current.model, apiKey: googleApiKey, temperature: 0,});
				break;
			case "openai":
				chatModel = new ChatOpenAI({ model: settingsRef.current.model, apiKey });
				break;
			case "ollama":
				chatModel = new Ollama({ model: settingsRef.current.model });
				break;
		}
		console.log(chatModel);
	};

	useEffect(() => {
		return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();

				const elMenuFilter = containerRef.current.querySelector(".menu-filter");
				const elMenuGeneral = containerRef.current.querySelector(".menu-general");

				if (elMenuFilter.classList.contains("active")) {
					q();
				}
				else if (elMenuFilter.classList.contains("active")) {
					q2();
				}
				else {
					q3();
				}
			}
		}

		if (textAreaRef) {
			textAreaRef.current.addEventListener("keydown", handleKeyDown);
		}



		if (settingsRef) {
			//settingsRef.current.server = "ollama";
			//settingsRef.current.model = "phi4:14b";

			//const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
			//console.log("::::::::", import.meta.env.VITE_OPENAI_API_KEY);
			//const chatModel = new ChatOpenAI({ model: 'gpt-3.5-turbo', apiKey });
			//const chatModel = new ChatOpenAI({ model: 'gpt-3.5-turbo', apiKey });
			//const chatModel = new ChatOpenAI({ model: 'gpt-3.5-turbo', apiKey });
			//const chatModel = new ChatOpenAI({ model: 'gpt-4', apiKey });
			//const chatModel = new ChatOpenAI({ model: 'gpt-3.5-turbo', apiKey });

			//const chatModel = new Ollama({ model: "deepseek-r1:8b" });
			//const chatModel = new Ollama({ model: "llama3.1:8b" });
			//let chatModel = new Ollama({ model: "phi4:14b" });
			//const chatModel = new Ollama({ model: "mistral:7b" });

			changeModel();

			settingsRef.current.addEventListener(settingsRef.current.EVENT.MODEL_CHANGE, (event) => {
				console.log("🔄 모델 변경됨:", event);
				changeModel();
			});
		}


		const toggleCollapse = () => {
			if (!containerRef.current) return;

			containerRef.current.classList.toggle("collapse");

			if (!containerRef.current.classList.contains("collapse")) {
				// this.#resetAsk();
			}
		};

		collapseIconRef.current.addEventListener("click", toggleCollapse);
		expandIconRef.current.addEventListener("click", toggleCollapse);

		const menuClickHandler = (e) => {
			containerRef.current.querySelectorAll(".menu-icon").forEach(elem => {
				elem.classList.remove("active");
			});

			e.target.closest(".menu-icon").classList.add("active");

			console.log(settingsRef);
			if (e.target.closest(".menu-setting")) {
				settingsRef.current.classList.add("expand");
			}
			else {
				settingsRef.current.classList.remove("expand");
			}
		};

		menuFilterRef.current.addEventListener("click", menuClickHandler);
		menuGeneralRef.current.addEventListener("click", menuClickHandler);
		menuSettingRef.current.addEventListener("click", menuClickHandler);

		//this.classList.add("collapse");

		/**
		this.shadowRoot.querySelector(".icon").addEventListener("click", e => {
			this.classList.toggle("collapse");

			if (!this.classList.contains("collapse")) {
				//this.#resetAsk();
			}
		});

		this.shadowRoot.querySelector(".close").addEventListener("click", e => {
			this.classList.toggle("collapse");
		}); */

		// ✅ 컴포넌트 언마운트 시 이벤트 리스너 제거
		return () => {
			if (textAreaRef.current) {
				textAreaRef.current.removeEventListener("keydown", handleKeyDown);
			}
		};
	}, []);


	return (
		<nx-ai-container className="collapse"></nx-ai-container>
	);

	return (
		<div ref={containerRef} className="ai-chat collapse">
			<div className="wrapper">
				<nx-ai-settings ref={settingsRef}></nx-ai-settings>

				<div className="container">

					<div className="head">
						<div className="logo"/>
					</div>
					<nx-ai-chat ref={chatRef}></nx-ai-chat>
					<div className="foot">
						<textarea ref={textAreaRef} name="ask" id="q" name="q" rows="4"
								  placeholder="나에게 무엇이든 물어봐..."></textarea>
					</div>
				</div>
				<div className="menu">
					<div ref={collapseIconRef} className="collapse-icon">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
							 viewBox="0 0 16 16">
							<path
								d="M6 8a.5.5 0 0 0 .5.5h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L12.293 7.5H6.5A.5.5 0 0 0 6 8m-2.5 7a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5"/>
						</svg>
					</div>

					<div ref={menuFilterRef} className="menu-icon menu-filter">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
							 className="bi bi-funnel-fill" viewBox="0 0 16 16">
							<path
								d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5z"/>
						</svg>
					</div>

					<div ref={menuGeneralRef} className="menu-icon menu-general active">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
							 className="bi bi-chat-fill" viewBox="0 0 16 16">
							<path
								d="M8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6-.097 1.016-.417 2.13-.771 2.966-.079.186.074.394.273.362 2.256-.37 3.597-.938 4.18-1.234A9 9 0 0 0 8 15"/>
						</svg>
					</div>

					<div ref={menuGeneralRef} className="menu-icon menu-db">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
							 className="bi bi-chat-fill" viewBox="0 0 16 16">
							<path
								d="M8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6-.097 1.016-.417 2.13-.771 2.966-.079.186.074.394.273.362 2.256-.37 3.597-.938 4.18-1.234A9 9 0 0 0 8 15"/>
						</svg>
					</div>

					<div ref={menuSettingRef} className="menu-icon menu-setting">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
							 className="bi bi-gear-fill" viewBox="0 0 16 16">
							<path
								d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>
						</svg>
					</div>
				</div>
			</div>

			<div ref={expandIconRef} className="expand-icon">
				<svg width="32" height="32" fill="green" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5"
					 className="h-6 w-6"
					 viewBox="-0.17090198558635983 0.482230148717937 41.14235318283891 40.0339509076386">
					<text x="-9999" y="-9999">ChatGPT</text>
					<path
						d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835A9.964 9.964 0 0 0 18.306.5a10.079 10.079 0 0 0-9.614 6.977 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 7.516 3.35 10.078 10.078 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.243-11.813zM22.498 37.886a7.474 7.474 0 0 1-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.49 7.496zM6.392 31.006a7.471 7.471 0 0 1-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103l-8.051 4.649a7.504 7.504 0 0 1-10.24-2.744zM4.297 13.62A7.469 7.469 0 0 1 8.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.01L7.04 23.856a7.504 7.504 0 0 1-2.743-10.237zm27.658 6.437l-9.724-5.615 3.367-1.943a.121.121 0 0 1 .113-.01l8.052 4.648a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.65-1.132zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.05-4.645a7.497 7.497 0 0 1 11.135 7.763zm-21.063 6.929l-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225zm1.829-3.943l4.33-2.501 4.332 2.5v5l-4.331 2.5-4.331-2.5V18z"/>
				</svg>
			</div>
		</div>
	);
};

export default AiChat;
