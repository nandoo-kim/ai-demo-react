import { lazy } from "react";

// 개별 페이지를 Lazy 방식으로 불러오기
const Test1 = lazy(() => import("../views/Test1.tsx"));
const DocList1 = lazy(() => import("../views/DocList1.tsx"));
const Population = lazy(() => import("../views/Population.tsx"));
const DocList2 = lazy(() => import("../views/DocList2.tsx"));
const DocList3 = lazy(() => import("../views/DocList3.tsx"));

export interface RouteType {
    path: string;
    Component: React.FC;
}

const routes: RouteType[] = [
    { path: "/", Component: Test1 },
    { path: "/doc/doc-list", Component: DocList1 },
    { path: "/data/population", Component: Population },
    { path: "/doc/doc-list2", Component: DocList2 },
    { path: "/doc/doc-list3", Component: DocList3 },
];

export default routes;
