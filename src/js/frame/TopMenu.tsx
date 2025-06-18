import React from "react";

const TopMenu: React.FC = () => {
	const wrapStyle: React.CSSProperties = {
		backgroundColor: "#333",
		color: "white",
		padding: "8px",
		textAlign: "center",
		fontSize: "16px",
	};

	return (
		<div style={wrapStyle}>
			Vite + React + TypeScript + Qdrant + OpenAI + LangChain + Spring Boot + Nine Grid
		</div>
	);
};

export default TopMenu;
