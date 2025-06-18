import React, {useEffect, useState, lazy, Suspense} from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import styled from 'styled-components';
import routes from "./js/components/routes"; // ✅ routes.tsx 임포트

import './App.css'

import LeftMenu from "./js/frame/LeftMenu"; // 웹 컴포넌트 import
import TopMenu from "./js/frame/TopMenu"; // 웹 컴포넌트 import
import AiChat from "./js/components/AiChat.tsx"; // 웹 컴포넌트 import

//import i18next from "i18next";
import ninegrid from "ninegrid2";
//import jQuery from "jquery";
/**
import i18next from "i18next";
import ninegrid from "ninegrid"; // CommonJS 모듈 그대로 유지

// ✅ 글로벌 변수 설정 (NineGrid가 CDN을 기대하기 때문에 수동 설정 필요)
window.$ = $;
window.i18next = i18next;
*/
/**
 * .wrapper {
 *    height: 100%;
 *    display: flex;
 *    flex-direction: column;
 * }
 */
function App() {

    ninegrid.cssPath = "/css/nine-grid";
    /**
    ninegrid.setCssPath("/css/nine-grid");
    ninegrid.i18n.addResourceBundle(
        "ko", "/messages/message.ko.prop",
        "en", "/messages/message.en.prop",
    ); */


    //console.log(window);
    const [count, setCount] = useState(0)

    const wrapStyle: React.CSSProperties = {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
    };

    const Container = styled.div`
        display: flex;
        flex-direction: column;
        flex: 1;
        padding: 20px;
    `;


    /**
    return (
        <div style={wrapStyle}>
            <Router>
                <TopMenu />
                <LeftMenu />

                <Suspense fallback={<div>Loading...</div>}>
                    <Routes>
                        <Route>
                            {routes.map(({path, Component}, index) => (
                                <Route key={index} path={path} element={<Component/>}/>
                            ))}
                        </Route>
                    </Routes>
                </Suspense>
            </Router>
        </div>
    )
    */

    return (
        <div style={wrapStyle}>
            <Router>
                <TopMenu />
                <LeftMenu />
                <AiChat />

                <Suspense fallback={<div>Loading...</div>}>
                    <Routes>
                        <Route>
                            {routes.map(({path, Component}, index) => (
                                <Route key={index} path={path} element={<Component/>}/>
                            ))}
                        </Route>
                    </Routes>
                </Suspense>
            </Router>
        </div>
    )
}

export default App
