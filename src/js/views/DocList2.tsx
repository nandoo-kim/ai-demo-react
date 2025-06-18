import React, { useEffect, useRef } from "react";

import ninegrid from "ninegrid2";

const DocList2: React.FC = () => {

	//ninegrid.cssPath = "/css/nine-grid";

	// ✅ 컴포넌트가 로딩될 때 자동으로 실행
	useEffect(() => {
		//console.log(document.querySelectorAll("div"));
		//console.log(ninegrid.version);
		ninegrid.cssPath = "/css/nine-grid";
		//ninegrid.setCssPath("/css/nine-grid");
	}, []);

	return (
		<div>
			<nine-grid display-row-count="3" row-resizable="true" col-movable="true">
				<table>
					<colgroup>
						<col width="40" fixed="left"/>
						<col width="100" fixed="left"/>
						<col width="100"/>
						<col width="100"/>
						<col width="200"/>
						<col width="100"/>
						<col width="100"/>
						<col width="100"/>
					</colgroup>
					<thead>
					<tr>
						<th>No.</th>
						<th>
							<nx-i18n>
								<datalist>
									<option locale="ko" label="이름"></option>
									<option locale="en" label="Name"></option>
								</datalist>
							</nx-i18n>
						</th>
						<th>
							<nx-i18n>
								<datalist>
									<option locale="ko" label="성별"></option>
									<option locale="en" label="Gender"></option>
								</datalist>
							</nx-i18n>
						</th>
						<th>
							<nx-i18n>
								<datalist>
									<option locale="ko" label="나이"></option>
									<option locale="en" label="Age"></option>
								</datalist>
							</nx-i18n>
						</th>
						<th>
							<nx-i18n>
								<datalist>
									<option locale="ko" label="연락처"></option>
									<option locale="en" label="Contact"></option>
								</datalist>
							</nx-i18n>
						</th>
						<th>
							<nx-i18n>
								<datalist>
									<option locale="ko" label="국어"></option>
									<option locale="en" label="Korean"></option>
								</datalist>
							</nx-i18n>
						</th>
						<th>
							<nx-i18n>
								<datalist>
									<option locale="ko" label="수학"></option>
									<option locale="en" label="Math"></option>
								</datalist>
							</nx-i18n>
						</th>
						<th>
							<nx-i18n>
								<datalist>
									<option locale="ko" label="영어"></option>
									<option locale="en" label="English"></option>
								</datalist>
							</nx-i18n>
						</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<th data-bind="rowState" data-expr="data.__ng._[NINEGRID.ROW.ORDER]" text-align="center">
							<ng-row-indicator has-icon-pin="true" has-icon-detail="true"
											  className="ng-left"></ng-row-indicator>
						</th>
						<td data-bind="NAME"></td>
						<td data-bind="SEX" text-align="center"></td>
						<td data-bind="AGE" text-align="right"></td>
						<td data-bind="TEL"></td>
						<td data-bind="REC1" text-align="right"></td>
						<td data-bind="REC2" text-align="right"></td>
						<td data-bind="REC3" text-align="right"></td>
					</tr>
					</tbody>
				</table>
			</nine-grid>

			<div className="grid-wrapper">

			</div>
		</div>
	);
};


export default DocList2;

