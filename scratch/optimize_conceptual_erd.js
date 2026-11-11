const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Optimized, compact XML for Slide 14 Conceptual ERD
const xml = `<mxGraphModel adaptiveColors="auto">
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />

    <mxCell id="title" value="&lt;b&gt;RECIPEHUB - THIẾT KẾ CƠ SỞ DỮ LIỆU: MÔ HÌNH KHÁI NIỆM (CONCEPTUAL ERD)&lt;/b&gt;&lt;br&gt;&lt;span style=&quot;font-size:10.5px;color:#475569;&quot;&gt;Slide 14 | Chuẩn Presentation V11 | Mô hình thực thể nghiệp vụ, Cardinality, Business Rules [BR-01..07]&lt;/span&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8fafc;strokeColor=#64748b;align=center;fontSize=12;fontColor=#0f172a;" vertex="1" parent="1">
      <mxGeometry x="20" y="20" width="1300" height="50" as="geometry" />
    </mxCell>

    <mxCell id="canvas" value="&lt;b&gt;Miền Dữ Liệu Nghiệp Vụ Cốt Lõi (Core Business Entities)&lt;/b&gt;" style="swimlane;startSize=26;rounded=1;html=1;fillColor=#ffffff;strokeColor=#cbd5e1;fontSize=11;collapsible=0;" vertex="1" parent="1">
      <mxGeometry x="20" y="80" width="1300" height="430" as="geometry" />
    </mxCell>

    <mxCell id="u" value="&lt;b&gt;USER&lt;/b&gt;&lt;br&gt;&lt;small&gt;(Người dùng)&lt;/small&gt;&lt;hr&gt;&lt;div align=&apos;left&apos;&gt;• FullName&lt;br&gt;• Email&lt;br&gt;• AssignedRole&lt;br&gt;• AccountStatus&lt;/div&gt;" style="rounded=1;html=1;fillColor=#eff6ff;strokeColor=#3b82f6;strokeWidth=1.5;fontSize=11;" vertex="1" parent="canvas">
      <mxGeometry x="30" y="40" width="145" height="110" as="geometry" />
    </mxCell>

    <mxCell id="ro" value="&lt;b&gt;ROLE&lt;/b&gt;&lt;br&gt;&lt;small&gt;(Vai trò)&lt;/small&gt;&lt;hr&gt;&lt;div align=&apos;left&apos;&gt;• RoleCode (Rnd, Barista)&lt;br&gt;• RoleName&lt;/div&gt;" style="rounded=1;html=1;fillColor=#eff6ff;strokeColor=#3b82f6;fontSize=11;" vertex="1" parent="canvas">
      <mxGeometry x="30" y="190" width="145" height="80" as="geometry" />
    </mxCell>

    <mxCell id="r" value="&lt;b&gt;RECIPE&lt;/b&gt;&lt;br&gt;&lt;small&gt;(Công thức gốc)&lt;/small&gt;&lt;hr&gt;&lt;div align=&apos;left&apos;&gt;• RecipeCode&lt;br&gt;• CreationDate&lt;br&gt;• ArchiveStatus&lt;br&gt;• AuthorReference&lt;/div&gt;" style="rounded=1;html=1;fillColor=#ecfdf5;strokeColor=#10b981;strokeWidth=2;fontSize=11;" vertex="1" parent="canvas">
      <mxGeometry x="235" y="40" width="155" height="110" as="geometry" />
    </mxCell>

    <mxCell id="rv" value="&lt;b&gt;RECIPE_VERSION&lt;/b&gt;&lt;br&gt;&lt;small&gt;(Phiên bản kỹ thuật R&amp;D)&lt;/small&gt;&lt;hr&gt;&lt;div align=&apos;left&apos;&gt;• VersionNumber (v1, v2)&lt;br&gt;• VersionName&lt;br&gt;• State (Draft, Published)&lt;br&gt;• PublishedTimestamp&lt;br&gt;• PrimaryImageRef&lt;/div&gt;" style="rounded=1;html=1;fillColor=#ecfdf5;strokeColor=#059669;strokeWidth=2.5;fontSize=11;" vertex="1" parent="canvas">
      <mxGeometry x="450" y="40" width="180" height="130" as="geometry" />
    </mxCell>

    <mxCell id="ry" value="&lt;b&gt;RECIPE_YIELD&lt;/b&gt;&lt;br&gt;&lt;small&gt;(Sản lượng chuẩn)&lt;/small&gt;&lt;hr&gt;&lt;div align=&apos;left&apos;&gt;• StandardQuantity&lt;br&gt;• OutputUnit&lt;/div&gt;" style="rounded=1;html=1;fillColor=#ecfdf5;strokeColor=#10b981;fontSize=11;" vertex="1" parent="canvas">
      <mxGeometry x="235" y="190" width="155" height="80" as="geometry" />
    </mxCell>

    <mxCell id="ri" value="&lt;b&gt;RECIPE_INGREDIENT&lt;/b&gt;&lt;br&gt;&lt;small&gt;(Định lượng thành phần)&lt;/small&gt;&lt;hr&gt;&lt;div align=&apos;left&apos;&gt;• DosageQuantity&lt;br&gt;• DosageUnit&lt;br&gt;• PrepStage&lt;br&gt;• ExecutionOrder&lt;br&gt;• IngSnapshot&lt;/div&gt;" style="rounded=1;html=1;fillColor=#fef3c7;strokeColor=#f59e0b;strokeWidth=2;fontSize=11;" vertex="1" parent="canvas">
      <mxGeometry x="690" y="40" width="170" height="130" as="geometry" />
    </mxCell>

    <mxCell id="rs" value="&lt;b&gt;RECIPE_STEP&lt;/b&gt;&lt;br&gt;&lt;small&gt;(Bước SOP pha chế)&lt;/small&gt;&lt;hr&gt;&lt;div align=&apos;left&apos;&gt;• StepSequence&lt;br&gt;• Title &amp; Description&lt;br&gt;• DurationEstimate&lt;br&gt;• SafetyWarning&lt;/div&gt;" style="rounded=1;html=1;fillColor=#fef3c7;strokeColor=#f59e0b;strokeWidth=1.5;fontSize=11;" vertex="1" parent="canvas">
      <mxGeometry x="450" y="210" width="180" height="120" as="geometry" />
    </mxCell>

    <mxCell id="sm" value="&lt;b&gt;STEP_MEDIA&lt;/b&gt;&lt;br&gt;&lt;small&gt;(Hình ảnh SOP)&lt;/small&gt;&lt;hr&gt;&lt;div align=&apos;left&apos;&gt;• MediaAssetRef&lt;br&gt;• DisplayOrder&lt;br&gt;• IsPrimaryThumbnail&lt;/div&gt;" style="rounded=1;html=1;fillColor=#fef3c7;strokeColor=#f59e0b;fontSize=11;" vertex="1" parent="canvas">
      <mxGeometry x="450" y="350" width="180" height="70" as="geometry" />
    </mxCell>

    <mxCell id="ing" value="&lt;b&gt;INGREDIENT&lt;/b&gt;&lt;br&gt;&lt;small&gt;(Nguyên liệu danh mục)&lt;/small&gt;&lt;hr&gt;&lt;div align=&apos;left&apos;&gt;• IngredientCode&lt;br&gt;• IngredientName&lt;br&gt;• DefaultUnit&lt;br&gt;• UsageState&lt;/div&gt;" style="rounded=1;html=1;fillColor=#faf5ff;strokeColor=#a855f7;strokeWidth=2;fontSize=11;" vertex="1" parent="canvas">
      <mxGeometry x="920" y="40" width="165" height="120" as="geometry" />
    </mxCell>

    <mxCell id="cat" value="&lt;b&gt;CATEGORY&lt;/b&gt;&lt;br&gt;&lt;small&gt;(Phân loại nguyên liệu)&lt;/small&gt;&lt;hr&gt;&lt;div align=&apos;left&apos;&gt;• CategoryCode&lt;br&gt;• CategoryName&lt;/div&gt;" style="rounded=1;html=1;fillColor=#faf5ff;strokeColor=#a855f7;fontSize=11;" vertex="1" parent="canvas">
      <mxGeometry x="1135" y="40" width="140" height="80" as="geometry" />
    </mxCell>

    <mxCell id="un" value="&lt;b&gt;UNIT &amp; CATEGORY&lt;/b&gt;&lt;br&gt;&lt;small&gt;(Đơn vị tính quy chuẩn)&lt;/small&gt;&lt;hr&gt;&lt;div align=&apos;left&apos;&gt;• UnitCode (ml, g, shot)&lt;br&gt;• Category (Vol, Mass)&lt;/div&gt;" style="rounded=1;html=1;fillColor=#faf5ff;strokeColor=#a855f7;fontSize=11;" vertex="1" parent="canvas">
      <mxGeometry x="1135" y="150" width="140" height="80" as="geometry" />
    </mxCell>

    <mxCell id="inc" value="&lt;b&gt;INCIDENT_REPORT&lt;/b&gt;&lt;br&gt;&lt;small&gt;(Sự cố tại quầy bar)&lt;/small&gt;&lt;hr&gt;&lt;div align=&apos;left&apos;&gt;• IncidentCode&lt;br&gt;• StoreIdentifier&lt;br&gt;• IssueDescription&lt;br&gt;• Status&lt;/div&gt;" style="rounded=1;html=1;fillColor=#fee2e2;strokeColor=#ef4444;strokeWidth=1.5;fontSize=11;" vertex="1" parent="canvas">
      <mxGeometry x="690" y="210" width="170" height="110" as="geometry" />
    </mxCell>

    <mxCell id="qz" value="&lt;b&gt;QUIZ_CERTIFICATION&lt;/b&gt;&lt;br&gt;&lt;small&gt;(Sát hạch Barista SOP)&lt;/small&gt;&lt;hr&gt;&lt;div align=&apos;left&apos;&gt;• QuestionBank&lt;br&gt;• PassThreshold (80%)&lt;br&gt;• Score &amp; Certificate&lt;/div&gt;" style="rounded=1;html=1;fillColor=#e0e7ff;strokeColor=#6366f1;strokeWidth=1.5;fontSize=11;" vertex="1" parent="canvas">
      <mxGeometry x="690" y="335" width="170" height="85" as="geometry" />
    </mxCell>

    <mxCell id="e1" value="gán vai trò" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#3b82f6;fontSize=10;" edge="1" parent="canvas" source="u" target="ro"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="c1a" value="0..*" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e1"><mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint y="-5" as="offset"/></mxGeometry></mxCell>
    <mxCell id="c1b" value="1" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e1"><mxGeometry x="0.7" relative="1" as="geometry"><mxPoint y="5" as="offset"/></mxGeometry></mxCell>

    <mxCell id="e2" value="sáng tạo" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#10b981;fontSize=10;" edge="1" parent="canvas" source="u" target="r"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="c2a" value="1" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e2"><mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint x="10" y="-8" as="offset"/></mxGeometry></mxCell>
    <mxCell id="c2b" value="0..*" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e2"><mxGeometry x="0.7" relative="1" as="geometry"><mxPoint x="-10" y="-8" as="offset"/></mxGeometry></mxCell>

    <mxCell id="e3" value="quản lý phiên bản" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#059669;strokeWidth=2;fontSize=10;fontStyle=1;" edge="1" parent="canvas" source="r" target="rv"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="c3a" value="1" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e3"><mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint x="10" y="-8" as="offset"/></mxGeometry></mxCell>
    <mxCell id="c3b" value="1..* [BR-02]" style="edgeLabel;html=1;fontSize=10;fontStyle=1;fontColor=#b91c1c;" vertex="1" connectable="0" parent="e3"><mxGeometry x="0.7" relative="1" as="geometry"><mxPoint x="-15" y="-10" as="offset"/></mxGeometry></mxCell>

    <mxCell id="e4" value="định mức" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#10b981;fontSize=10;" edge="1" parent="canvas" source="rv" target="ry"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="c4a" value="1" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e4"><mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint y="-5" as="offset"/></mxGeometry></mxCell>
    <mxCell id="c4b" value="1 [BR-05]" style="edgeLabel;html=1;fontSize=10;fontStyle=1;fontColor=#b91c1c;" vertex="1" connectable="0" parent="e4"><mxGeometry x="0.7" relative="1" as="geometry"><mxPoint y="5" as="offset"/></mxGeometry></mxCell>

    <mxCell id="e5" value="thành phần" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#f59e0b;strokeWidth=2;fontSize=10;fontStyle=1;" edge="1" parent="canvas" source="rv" target="ri"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="c5a" value="1" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e5"><mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint x="10" y="-8" as="offset"/></mxGeometry></mxCell>
    <mxCell id="c5b" value="1..* [BR-01]" style="edgeLabel;html=1;fontSize=10;fontStyle=1;fontColor=#b91c1c;" vertex="1" connectable="0" parent="e5"><mxGeometry x="0.7" relative="1" as="geometry"><mxPoint x="-15" y="-10" as="offset"/></mxGeometry></mxCell>

    <mxCell id="e6" value="quy trình" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#f59e0b;fontSize=10;" edge="1" parent="canvas" source="rv" target="rs"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="c6a" value="1" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e6"><mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint y="-5" as="offset"/></mxGeometry></mxCell>
    <mxCell id="c6b" value="1..* [BR-01]" style="edgeLabel;html=1;fontSize=10;fontStyle=1;fontColor=#b91c1c;" vertex="1" connectable="0" parent="e6"><mxGeometry x="0.7" relative="1" as="geometry"><mxPoint y="5" as="offset"/></mxGeometry></mxCell>

    <mxCell id="e7" value="gắn ảnh SOP" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#f59e0b;fontSize=10;" edge="1" parent="canvas" source="rs" target="sm"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="c7a" value="1" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e7"><mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint y="-5" as="offset"/></mxGeometry></mxCell>
    <mxCell id="c7b" value="0..*" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e7"><mxGeometry x="0.7" relative="1" as="geometry"><mxPoint y="5" as="offset"/></mxGeometry></mxCell>

    <mxCell id="e8" value="tham chiếu" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#a855f7;fontSize=10;" edge="1" parent="canvas" source="ing" target="ri"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="c8a" value="1" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e8"><mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint x="-10" y="-8" as="offset"/></mxGeometry></mxCell>
    <mxCell id="c8b" value="0..*" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e8"><mxGeometry x="0.7" relative="1" as="geometry"><mxPoint x="10" y="-8" as="offset"/></mxGeometry></mxCell>

    <mxCell id="e9" value="phân nhóm" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#a855f7;fontSize=10;" edge="1" parent="canvas" source="cat" target="ing"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="c9a" value="1" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e9"><mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint y="5" as="offset"/></mxGeometry></mxCell>
    <mxCell id="c9b" value="0..*" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e9"><mxGeometry x="0.7" relative="1" as="geometry"><mxPoint y="-5" as="offset"/></mxGeometry></mxCell>

    <mxCell id="e10" value="truy vết lỗi" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#ef4444;fontSize=10;" edge="1" parent="canvas" source="rv" target="inc"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="c10a" value="1" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e10"><mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint x="10" y="5" as="offset"/></mxGeometry></mxCell>
    <mxCell id="c10b" value="0..* [BR-07]" style="edgeLabel;html=1;fontSize=10;fontStyle=1;fontColor=#b91c1c;" vertex="1" connectable="0" parent="e10"><mxGeometry x="0.7" relative="1" as="geometry"><mxPoint x="-10" y="-8" as="offset"/></mxGeometry></mxCell>

    <mxCell id="e11" value="sát hạch SOP" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#6366f1;fontSize=10;" edge="1" parent="canvas" source="rv" target="qz"><mxGeometry relative="1" as="geometry" /></mxCell>
    <mxCell id="c11a" value="1" style="edgeLabel;html=1;fontSize=10;fontStyle=1;" vertex="1" connectable="0" parent="e11"><mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint x="10" y="5" as="offset"/></mxGeometry></mxCell>
    <mxCell id="c11b" value="0..* [BR-06]" style="edgeLabel;html=1;fontSize=10;fontStyle=1;fontColor=#b91c1c;" vertex="1" connectable="0" parent="e11"><mxGeometry x="0.7" relative="1" as="geometry"><mxPoint x="-10" y="-8" as="offset"/></mxGeometry></mxCell>

    <mxCell id="br_box" value="&lt;b&gt;QUY TẮC NGHIỆP VỤ CHI PHỐI QUAN HỆ DỮ LIỆU (BUSINESS RULES)&lt;/b&gt;&lt;hr&gt;&lt;table width=&apos;100%&apos; style=&apos;font-size:10px;&apos;&gt;&lt;tr&gt;&lt;td width=&apos;50%&apos; valign=&apos;top&apos;&gt;• &lt;b style=&apos;color:#dc2626;&apos;&gt;[BR-01]&lt;/b&gt; RecipeVersion hợp lệ nộp duyệt phải có &amp;ge;1 RecipeStep và &amp;ge;1 RecipeIngredient (Quantity &gt; 0).&lt;br&gt;• &lt;b style=&apos;color:#dc2626;&apos;&gt;[BR-02]&lt;/b&gt; Singleton Draft: Mỗi Recipe chỉ có tối đa 1 bản ghi Draft đang soạn thảo.&lt;br&gt;• &lt;b style=&apos;color:#dc2626;&apos;&gt;[BR-03]&lt;/b&gt; Duy nhất 1 phiên bản Published đang có hiệu lực phục vụ pha chế toàn chuỗi.&lt;br&gt;• &lt;b style=&apos;color:#dc2626;&apos;&gt;[BR-04]&lt;/b&gt; Khóa bất biến: Phiên bản Published bị khóa Read-only, cấm UPDATE/DELETE trực tiếp.&lt;/td&gt;&lt;td width=&apos;50%&apos; valign=&apos;top&apos;&gt;• &lt;b style=&apos;color:#dc2626;&apos;&gt;[BR-05]&lt;/b&gt; Bắt buộc định mức: Mỗi RecipeVersion gắn đúng 1 RecipeYield (Quantity &gt; 0, Unit chuẩn).&lt;br&gt;• &lt;b style=&apos;color:#dc2626;&apos;&gt;[BR-06]&lt;/b&gt; Điểm đỗ Quiz SOP &amp;ge;80% mới cấp chứng nhận pha chế tại cửa hàng.&lt;br&gt;• &lt;b style=&apos;color:#dc2626;&apos;&gt;[BR-07]&lt;/b&gt; Báo cáo sự cố IncidentReport bắt buộc gắn với RecipeVersion đang Published tại quầy bar.&lt;br&gt;• &lt;b style=&apos;color:#2563eb;&apos;&gt;[NOTE]&lt;/b&gt; Microservices độc lập: Không tạo FK vật lý liên DB; liên kết bằng PublicId ổn định.&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8fafc;strokeColor=#475569;align=left;verticalAlign=top;spacing=6;fontSize=10;" vertex="1" parent="1">
      <mxGeometry x="20" y="520" width="1300" height="120" as="geometry" />
    </mxCell>

    <mxCell id="warn" value="&lt;b style=&apos;color:#b91c1c;&apos;&gt;TRÁNH (SLIDE 14):&lt;/b&gt; Tuyệt đối KHÔNG đưa kiểu dữ liệu vật lý (VARCHAR, INT, BIGINT, UUID, PK) vào Conceptual ERD để tránh nhầm lẫn giữa mô hình khái niệm và vật lý." style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fef2f2;strokeColor=#f87171;align=center;fontSize=10.5;fontColor=#991b1b;" vertex="1" parent="1">
      <mxGeometry x="20" y="650" width="1300" height="35" as="geometry" />
    </mxCell>
  </root>
</mxGraphModel>`;

const baseMaterials = path.resolve('D:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/docs/materials');
const baseDiagrams = path.resolve('D:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/docs/diagrams');

fs.writeFileSync(path.join(baseMaterials, 'conceptual-erd.drawio'), xml, 'utf8');
fs.writeFileSync(path.join(baseDiagrams, 'conceptual-erd.drawio'), xml, 'utf8');

const deflated = zlib.deflateRawSync(Buffer.from(xml, 'utf8'));
const encoded = encodeURIComponent(deflated.toString('base64'));
console.log('Optimized raw XML length:', xml.length);
console.log('Optimized URL hash length:', encoded.length);
