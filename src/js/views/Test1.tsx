import React from "react";

const Test1: React.FC = () => {
	const wrapStyle: React.CSSProperties = {
		backgroundColor: "#333",
		color: "white",
		padding: "0px",
		textAlign: "center",
		fontSize: "18px",
	};

	return (
		<div style={wrapStyle}>
			Test1
		</div>
	);
};


export default Test1;

