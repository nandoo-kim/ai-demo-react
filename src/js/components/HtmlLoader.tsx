import React, { useEffect, useState } from "react";

const HtmlLoader = ({ path }) => {
    const [htmlContent, setHtmlContent] = useState("");

    useEffect(() => {
        fetch(path)
            .then(response => response.text())
            .then(data => {
                setHtmlContent(data);
            })
            .catch(error => {
                console.error("Error loading HTML content:", error);
                setHtmlContent("<p>컨텐츠를 불러오는 중 오류가 발생했습니다.</p>");
            });
    }, [path]);

    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};

export default HtmlLoader;
