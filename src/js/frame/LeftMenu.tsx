import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

//import ninegrid from "ninegrid2";

const LeftMenu: React.FC = () => {
	const navigate = useNavigate(); // ✅ React Router를 통해 페이지 이동
	const wrapStyle: React.CSSProperties = {
		backgroundColor: "#333",
		color: "white",
		padding: "0px",
		textAlign: "center",
		fontSize: "18px",
	};

	useEffect(() => {
		//ninegrid.cssPath = "/css/nine-grid";

		const handleMenuClick = (e: CustomEvent) => {
			const href = e.detail.target?.getAttribute("href");
			if (href) {
				navigate(href); // ✅ React Router를 통해 내부적으로 이동 (새로고침 없이)
			}
		};

		window.addEventListener("side-menu-click", handleMenuClick);

		return () => {
			window.removeEventListener("side-menu-click", handleMenuClick);
		};
	}, [navigate]); // ✅ `navigate`가 변경될 때만 실행

	return (
		<div style={wrapStyle}>
			<nx-side-menu>
				<nx-side-menu-head>
					<span>ADMIN</span>
				</nx-side-menu-head>

				<nx-side-menu-body>
					<nx-side-menu-item type="group" icon-class="icon-home"><span>AI Demo</span></nx-side-menu-item>
					<nx-side-menu-item href="/doc/doc-list">문서 관리</nx-side-menu-item>
					<nx-side-menu-item href="/data/population">지역별 인구증감</nx-side-menu-item>

					<nx-side-menu-item type="group" icon-class="icon-home"><span>콘텐츠 관리</span></nx-side-menu-item>
					<nx-side-menu-item href="/doc/doc-list2">문서 관리</nx-side-menu-item>
					<nx-side-menu-item href="/doc/doc-list3">문서 관리</nx-side-menu-item>
				</nx-side-menu-body>
			</nx-side-menu>
		</div>
	);
};


export default LeftMenu;

