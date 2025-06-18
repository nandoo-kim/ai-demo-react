import React, { useEffect, useRef } from "react";

//import NxAi from "ninegrid2";

const Population: React.FC = () => {
	const gridRef = useRef<HTMLDivElement>(null);
	const searchBoxRef = useRef<HTMLDivElement>(null);
	const searchButtonRef = useRef<HTMLButtonElement>(null);

	const wrapStyle: React.CSSProperties = {
		padding: "32px",
		height: "100%",
		border: "0px solid #ccc",
		display: "flex",
		flexDirection: "column",
	};

	const searchBoxStyle: React.CSSProperties = {
		fontSize: "12px",
		width: "100%",
		height: "32px",
		display: "flex",
		alignItems: "center",
		gap: "8px",
		padding: "16px 0px",
		backgroundColor: "#f0f1fd",
		border: "0px solid red",
		borderRadius: "5px",
		position: "relative",
		transition: "height 0.3s ease-in-out, padding 0.3s ease-in-out",
	};


	const fetchData = async () => {
		try {
			const params = searchBoxRef.current.getJsonData();
			console.log(params);

			gridRef.current.classList.add("loading");

			const response = await fetch("/api/data/population/selectList.do", {
				method: "POST", // ✅ POST 요청
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(params), // ✅ JSON 형식으로 변환하여 전달
			});

			//console.log(response);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}



			const result = await response.json();

			console.log("=================", result);
			//console.log(gridRef);
			gridRef.current.data.source = result.list;

			//grd.data.source = res.list;
			//etData(JSON.stringify(result, null, 2)); // ✅ 데이터를 JSON 형태로 저장
		} catch (error) {
			console.error("API 호출 오류:", error);
			//setData("데이터 로드 실패!");
		}
	};

	// ✅ 컴포넌트가 로딩될 때 자동으로 실행
	useEffect(() => {
		fetchData();

		const shadowRoot = searchBoxRef.current?.shadowRoot;
		shadowRoot.querySelector("#search-button").addEventListener("click", fetchData);
		//shadowRoot.querySelector("#search-button").addEventListener("click", fetchData);

		gridRef.current.collectionName = "my_collection";
		document.querySelector("nx-ai-container").target = gridRef.current;
	}, []);

	return (
		<div style={wrapStyle}>
			<nx-div ref={searchBoxRef}>
				<div style={searchBoxStyle}>
					<div>
						<label htmlFor="searchText">문서내용:</label>
						<input type="text" id="searchText" name="searchText" placeholder="문서내용"/>
					</div>

					<button id="search-button">검색</button>

					<div>
						<label htmlFor="searchText2">자연어:</label>
						<input type="text" id="searchText2" name="searchText2" placeholder="자연어"/>
					</div>

					<button type="submit">자연어 검색</button>
				</div>
			</nx-div>

			<div className="grid-wrapper">
				<nine-grid ref={gridRef} data-unique="agency_code,reference_month" caption="지역별 인구증감" select-type="row" auto-fit-col="true"
						   show-title-bar="true" show-menu-icon="true" show-status-bar="true" enable-fixed-col="true"
						   row-resizable="false" col-movable="true">
					<div>
						<button>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="green"
								 className="bi bi-folder-plus" viewBox="0 0 16 16">
								<path
									d="m.5 3 .04.87a2 2 0 0 0-.342 1.311l.637 7A2 2 0 0 0 2.826 14H9v-1H2.826a1 1 0 0 1-.995-.91l-.637-7A1 1 0 0 1 2.19 4h11.62a1 1 0 0 1 .996 1.09L14.54 8h1.005l.256-2.819A2 2 0 0 0 13.81 3H9.828a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 6.172 1H2.5a2 2 0 0 0-2 2m5.672-1a1 1 0 0 1 .707.293L7.586 3H2.19q-.362.002-.683.12L1.5 2.98a1 1 0 0 1 1-.98z"/>
								<path
									d="M13.5 9a.5.5 0 0 1 .5.5V11h1.5a.5.5 0 1 1 0 1H14v1.5a.5.5 0 1 1-1 0V12h-1.5a.5.5 0 0 1 0-1H13V9.5a.5.5 0 0 1 .5-.5"/>
							</svg>
						</button>
						<button>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="red"
								 className="bi bi-folder-x" viewBox="0 0 16 16">
								<path
									d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181L15.546 8H14.54l.265-2.91A1 1 0 0 0 13.81 4H2.19a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91H9v1H2.826a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31zm6.339-1.577A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139q.323-.119.684-.12h5.396z"/>
								<path
									d="M11.854 10.146a.5.5 0 0 0-.707.708L12.293 12l-1.146 1.146a.5.5 0 0 0 .707.708L13 12.707l1.146 1.147a.5.5 0 0 0 .708-.708L13.707 12l1.147-1.146a.5.5 0 0 0-.707-.708L13 11.293z"/>
							</svg>
						</button>
						<button>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="blue"
								 className="bi bi-floppy" viewBox="0 0 16 16">
								<path d="M11 2H9v3h2z"/>
								<path
									d="M1.5 0h11.586a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 1 16 2.914V14.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-13A1.5 1.5 0 0 1 1.5 0M1 1.5v13a.5.5 0 0 0 .5.5H2v-4.5A1.5 1.5 0 0 1 3.5 9h9a1.5 1.5 0 0 1 1.5 1.5V15h.5a.5.5 0 0 0 .5-.5V2.914a.5.5 0 0 0-.146-.353l-1.415-1.415A.5.5 0 0 0 13.086 1H13v4.5A1.5 1.5 0 0 1 11.5 7h-7A1.5 1.5 0 0 1 3 5.5V1H1.5a.5.5 0 0 0-.5.5m3 4a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V1H4zM3 15h10v-4.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5z"/>
							</svg>
						</button>
					</div>

					<table>
						<caption>Sheet1</caption>
						<colgroup>
							<col width="50" fixed="left" background-color="gray"/>
							<col width="90" fixed="left" background-color="red"/>
							<col width="90" fixed="left" background-color="red"/>
							<col width="100" background-color="gray"/>
							<col width="100" background-color="gray"/>
							<col width="100" background-color="gray"/>
							<col width="80" background-color="gray"/>
							<col width="80" background-color="gray"/>
							<col width="80" background-color="gray"/>
							<col width="80" background-color="gray"/>
							<col width="80" background-color="gray"/>
							<col width="80" background-color="gray"/>
							<col width="80" background-color="gray"/>
							<col width="80" background-color="gray"/>
							<col width="80" background-color="gray"/>
						</colgroup>
						<thead>
						<tr>
							<th rowSpan="2">No.</th>
							<th rowSpan="2">행정기관코드</th>
							<th rowSpan="2">기준연월</th>
							<th rowSpan="2">시도명</th>
							<th rowSpan="2">시군구명</th>
							<th rowSpan="2">읍면동명</th>
							<th colSpan="3">전월인구수</th>
							<th colSpan="3">당월인구수</th>
							<th colSpan="3">전월대비 인구증감</th>
						</tr>
						<tr>
							<th title="전체 전월인구수">전체</th>
							<th title="전월 남자인구수">남자</th>
							<th title="전월 여자인구수">여자</th>
							<th title="전체 당월인구수">전체</th>
							<th title="당월 남자인구수">남자</th>
							<th title="당월 여자인구수">여자</th>
							<th title="전체 인구증감">전체</th>
							<th title="남자 인구증감">남자</th>
							<th title="여자 인구증감">여자</th>
						</tr>
						</thead>
						<tbody>
						<tr>
							<th><ng-row-indicator/></th>
							<td data-bind="agency_code" text-align="center"></td>
							<td data-bind="reference_month" text-align="center"></td>
							<td data-bind="province_name"></td>
							<td data-bind="city_name"></td>
							<td data-bind="district_name"></td>
							<td data-bind="prev_total_population"
								data-type="number"
								data-expr="data.prev_total_population.toLocaleString()"
								text-align="right"></td>
							<td data-bind="prev_male_population"
								data-type="number"
								data-expr="data.prev_male_population.toLocaleString()"
								text-align="right"></td>
							<td data-bind="prev_female_population"
								data-type="number"
								data-expr="data.prev_female_population.toLocaleString()"
								text-align="right"></td>
							<td data-bind="current_total_population"
								data-type="number"
								data-expr="data.current_total_population.toLocaleString()"
								text-align="right"></td>
							<td data-bind="current_male_population"
								data-type="number"
								data-expr="data.current_male_population.toLocaleString()"
								text-align="right"></td>
							<td data-bind="current_female_population"
								data-type="number"
								data-expr="data.current_female_population.toLocaleString()"
								text-align="right"></td>
							<td data-bind="total_population_change"
								data-type="number"
								data-expr="data.total_population_change.toLocaleString()"
								color="data.total_population_change >= 0 ? '' : '#999'"
								text-align="right"></td>
							<td data-bind="male_population_change"
								data-type="number"
								data-expr="data.male_population_change.toLocaleString()"
								color="data.male_population_change >= 0 ? '' : '#999'"
								text-align="right"></td>
							<td data-bind="female_population_change"
								data-type="number"
								data-expr="data.female_population_change.toLocaleString()"
								color="data.female_population_change >= 0 ? '' : '#999'"
								text-align="right"></td>
						</tr>
						</tbody>
					</table>
				</nine-grid>
			</div>
		</div>
	);
};


export default Population;

