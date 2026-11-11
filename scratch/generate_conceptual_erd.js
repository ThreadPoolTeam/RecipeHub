const fs = require('fs');
const path = require('path');

let content = fs.readFileSync('D:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/scratch/generate_conceptual_erd.js', 'utf8');

// Replace XML comments
content = content.replace(/<!--[\s\S]*?-->/g, '');

// Strip comments from xml string in generate_conceptual_erd.js
const xmlWithoutComments = `<mxGraphModel adaptiveColors="auto">
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />

    <mxCell id="title_banner" value="&lt;b&gt;RECIPEHUB - THIẾT KẾ CƠ SỞ DỮ LIỆU 1/2: MÔ HÌNH KHÁI NIỆM (CONCEPTUAL ERD)&lt;/b&gt;&lt;br&gt;&lt;span style=&quot;font-size:11px;color:#475569;font-weight:normal;&quot;&gt;Slide 14 | Chuẩn Presentation Guideline V11 | Mô hình hóa ngữ nghĩa nghiệp vụ, Cardinality, và Business Rules [BR-01..07] (Chưa phụ thuộc SQL/DBMS)&lt;/span&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8fafc;strokeColor=#64748b;strokeWidth=1.5;align=center;shadow=1;spacing=6;fontSize=14;fontColor=#0f172a;" vertex="1" parent="1">
      <mxGeometry x="40" y="20" width="1520" height="55" as="geometry" />
    </mxCell>

    <mxCell id="domain_canvas" value="&lt;b&gt;Miền Dữ Liệu Nghiệp Vụ Cốt Lõi (Core Business Domain &amp; Entities)&lt;/b&gt;" style="swimlane;startSize=28;rounded=1;arcSize=4;html=1;fillColor=#ffffff;strokeColor=#cbd5e1;strokeWidth=1.5;fontColor=#1e293b;fontSize=12;fontStyle=1;shadow=1;collapsible=0;" vertex="1" parent="1">
      <mxGeometry x="40" y="90" width="1520" height="570" as="geometry" />
    </mxCell>

    <mxCell id="ent_user" value="&lt;b&gt;USER&lt;/b&gt;&lt;br&gt;&lt;small style=&quot;color:#64748b;&quot;&gt;(Người dùng hệ thống)&lt;/small&gt;&lt;hr style=&quot;margin:4px 0;&quot;&gt;&lt;div style=&quot;text-align:left;font-size:10px;line-height:1.4;&quot;&gt;• FullName&lt;br&gt;• Email&lt;br&gt;• AssignedRole&lt;br&gt;• AccountStatus&lt;/div&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#eff6ff;strokeColor=#3b82f6;strokeWidth=2;align=center;shadow=1;fontSize=12;fontColor=#1e3a8a;spacing=6;" vertex="1" parent="domain_canvas">
      <mxGeometry x="40" y="50" width="180" height="130" as="geometry" />
    </mxCell>

    <mxCell id="ent_role" value="&lt;b&gt;ROLE&lt;/b&gt;&lt;br&gt;&lt;small style=&quot;color:#64748b;&quot;&gt;(Vai trò &amp; Quyền hạn)&lt;/small&gt;&lt;hr style=&quot;margin:4px 0;&quot;&gt;&lt;div style=&quot;text-align:left;font-size:10px;line-height:1.4;&quot;&gt;• RoleCode (Rnd, Barista, ...)&lt;br&gt;• RoleName&lt;br&gt;• Description&lt;/div&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#eff6ff;strokeColor=#3b82f6;strokeWidth=1.5;align=center;shadow=1;fontSize=11;fontColor=#1e3a8a;spacing=6;" vertex="1" parent="domain_canvas">
      <mxGeometry x="40" y="240" width="180" height="100" as="geometry" />
    </mxCell>

    <mxCell id="ent_recipe" value="&lt;b&gt;RECIPE&lt;/b&gt;&lt;br&gt;&lt;small style=&quot;color:#64748b;&quot;&gt;(Hồ sơ công thức gốc)&lt;/small&gt;&lt;hr style=&quot;margin:4px 0;&quot;&gt;&lt;div style=&quot;text-align:left;font-size:10px;line-height:1.4;&quot;&gt;• RecipeCode (Mã duy nhất)&lt;br&gt;• CreationDate&lt;br&gt;• ArchiveStatus&lt;br&gt;• AuthorReference&lt;/div&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ecfdf5;strokeColor=#10b981;strokeWidth=2;align=center;shadow=1;fontSize=12;fontColor=#065f46;spacing=6;" vertex="1" parent="domain_canvas">
      <mxGeometry x="300" y="50" width="190" height="130" as="geometry" />
    </mxCell>

    <mxCell id="ent_version" value="&lt;b&gt;RECIPE_VERSION&lt;/b&gt;&lt;br&gt;&lt;small style=&quot;color:#64748b;&quot;&gt;(Phiên bản kỹ thuật R&amp;D)&lt;/small&gt;&lt;hr style=&quot;margin:4px 0;&quot;&gt;&lt;div style=&quot;text-align:left;font-size:10px;line-height:1.4;&quot;&gt;• VersionNumber (v1, v2...)&lt;br&gt;• VersionName&lt;br&gt;• State (Draft, Published...)&lt;br&gt;• PublishedTimestamp&lt;br&gt;• PrimaryImageReference&lt;/div&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ecfdf5;strokeColor=#059669;strokeWidth=2.5;align=center;shadow=1;fontSize=12;fontColor=#064e3b;spacing=6;" vertex="1" parent="domain_canvas">
      <mxGeometry x="580" y="50" width="220" height="150" as="geometry" />
    </mxCell>

    <mxCell id="ent_yield" value="&lt;b&gt;RECIPE_YIELD&lt;/b&gt;&lt;br&gt;&lt;small style=&quot;color:#64748b;&quot;&gt;(Sản lượng chuẩn đầu ra)&lt;/small&gt;&lt;hr style=&quot;margin:4px 0;&quot;&gt;&lt;div style=&quot;text-align:left;font-size:10px;line-height:1.4;&quot;&gt;• StandardQuantity&lt;br&gt;• OutputUnit&lt;br&gt;• ServingNote&lt;/div&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ecfdf5;strokeColor=#10b981;strokeWidth=1.5;align=center;shadow=1;fontSize=11;fontColor=#065f46;spacing=6;" vertex="1" parent="domain_canvas">
      <mxGeometry x="300" y="240" width="190" height="100" as="geometry" />
    </mxCell>

    <mxCell id="ent_rec_ing" value="&lt;b&gt;RECIPE_INGREDIENT&lt;/b&gt;&lt;br&gt;&lt;small style=&quot;color:#64748b;&quot;&gt;(Định lượng thành phần)&lt;/small&gt;&lt;hr style=&quot;margin:4px 0;&quot;&gt;&lt;div style=&quot;text-align:left;font-size:10px;line-height:1.4;&quot;&gt;• DosageQuantity&lt;br&gt;• DosageUnit&lt;br&gt;• PreparationStage&lt;br&gt;• ExecutionOrder&lt;br&gt;• IngredientSnapshot&lt;/div&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fef3c7;strokeColor=#f59e0b;strokeWidth=2;align=center;shadow=1;fontSize=12;fontColor=#92400e;spacing=6;" vertex="1" parent="domain_canvas">
      <mxGeometry x="890" y="50" width="210" height="150" as="geometry" />
    </mxCell>

    <mxCell id="ent_step" value="&lt;b&gt;RECIPE_STEP&lt;/b&gt;&lt;br&gt;&lt;small style=&quot;color:#64748b;&quot;&gt;(Bước quy trình SOP pha chế)&lt;/small&gt;&lt;hr style=&quot;margin:4px 0;&quot;&gt;&lt;div style=&quot;text-align:left;font-size:10px;line-height:1.4;&quot;&gt;• StepSequence&lt;br&gt;• Title &amp; Description&lt;br&gt;• DurationEstimate&lt;br&gt;• TemperatureCondition&lt;br&gt;• EquipmentRequirement&lt;br&gt;• SafetyWarning&lt;/div&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fef3c7;strokeColor=#f59e0b;strokeWidth=2;align=center;shadow=1;fontSize=12;fontColor=#92400e;spacing=6;" vertex="1" parent="domain_canvas">
      <mxGeometry x="580" y="260" width="220" height="160" as="geometry" />
    </mxCell>

    <mxCell id="ent_step_media" value="&lt;b&gt;STEP_MEDIA&lt;/b&gt;&lt;br&gt;&lt;small style=&quot;color:#64748b;&quot;&gt;(Hình ảnh SOP minh họa)&lt;/small&gt;&lt;hr style=&quot;margin:4px 0;&quot;&gt;&lt;div style=&quot;text-align:left;font-size:10px;line-height:1.4;&quot;&gt;• MediaAssetRef&lt;br&gt;• DisplayOrder&lt;br&gt;• IsPrimaryThumbnail&lt;br&gt;• Caption&lt;/div&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fef3c7;strokeColor=#f59e0b;strokeWidth=1.5;align=center;shadow=1;fontSize=11;fontColor=#92400e;spacing=6;" vertex="1" parent="domain_canvas">
      <mxGeometry x="580" y="465" width="220" height="90" as="geometry" />
    </mxCell>

    <mxCell id="ent_ingredient" value="&lt;b&gt;INGREDIENT&lt;/b&gt;&lt;br&gt;&lt;small style=&quot;color:#64748b;&quot;&gt;(Nguyên liệu danh mục)&lt;/small&gt;&lt;hr style=&quot;margin:4px 0;&quot;&gt;&lt;div style=&quot;text-align:left;font-size:10px;line-height:1.4;&quot;&gt;• IngredientCode&lt;br&gt;• IngredientName&lt;br&gt;• DefaultUnit&lt;br&gt;• UsageState (Active/Inactive)&lt;br&gt;• QualityWarning&lt;/div&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#faf5ff;strokeColor=#a855f7;strokeWidth=2;align=center;shadow=1;fontSize=12;fontColor=#581c87;spacing=6;" vertex="1" parent="domain_canvas">
      <mxGeometry x="1190" y="50" width="200" height="150" as="geometry" />
    </mxCell>

    <mxCell id="ent_category" value="&lt;b&gt;CATEGORY&lt;/b&gt;&lt;br&gt;&lt;small style=&quot;color:#64748b;&quot;&gt;(Phân loại nguyên liệu)&lt;/small&gt;&lt;hr style=&quot;margin:4px 0;&quot;&gt;&lt;div style=&quot;text-align:left;font-size:10px;line-height:1.4;&quot;&gt;• CategoryCode&lt;br&gt;• CategoryName&lt;br&gt;• Description&lt;/div&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#faf5ff;strokeColor=#a855f7;strokeWidth=1.5;align=center;shadow=1;fontSize=11;fontColor=#581c87;spacing=6;" vertex="1" parent="domain_canvas">
      <mxGeometry x="1190" y="240" width="200" height="95" as="geometry" />
    </mxCell>

    <mxCell id="ent_unit" value="&lt;b&gt;UNIT &amp; UNIT_CATEGORY&lt;/b&gt;&lt;br&gt;&lt;small style=&quot;color:#64748b;&quot;&gt;(Hệ đo lường &amp; Đơn vị tính)&lt;/small&gt;&lt;hr style=&quot;margin:4px 0;&quot;&gt;&lt;div style=&quot;text-align:left;font-size:10px;line-height:1.4;&quot;&gt;• UnitCode (ml, gram, shot)&lt;br&gt;• Category (Volume, Mass)&lt;br&gt;• DecimalPlaces&lt;/div&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#faf5ff;strokeColor=#a855f7;strokeWidth=1.5;align=center;shadow=1;fontSize=11;fontColor=#581c87;spacing=6;" vertex="1" parent="domain_canvas">
      <mxGeometry x="1190" y="370" width="200" height="95" as="geometry" />
    </mxCell>

    <mxCell id="ent_incident" value="&lt;b&gt;INCIDENT_REPORT&lt;/b&gt;&lt;br&gt;&lt;small style=&quot;color:#64748b;&quot;&gt;(Báo cáo sự cố chất lượng tại quầy)&lt;/small&gt;&lt;hr style=&quot;margin:4px 0;&quot;&gt;&lt;div style=&quot;text-align:left;font-size:10px;line-height:1.4;&quot;&gt;• IncidentCode&lt;br&gt;• StoreIdentifier&lt;br&gt;• IssueDescription&lt;br&gt;• ReportedTimestamp&lt;br&gt;• ResolutionStatus&lt;/div&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fee2e2;strokeColor=#ef4444;strokeWidth=2;align=center;shadow=1;fontSize=12;fontColor=#7f1d1d;spacing=6;" vertex="1" parent="domain_canvas">
      <mxGeometry x="890" y="260" width="210" height="140" as="geometry" />
    </mxCell>

    <mxCell id="ent_quiz" value="&lt;b&gt;QUIZ_CERTIFICATION&lt;/b&gt;&lt;br&gt;&lt;small style=&quot;color:#64748b;&quot;&gt;(Khảo sát SOP &amp; Chứng chỉ Barista)&lt;/small&gt;&lt;hr style=&quot;margin:4px 0;&quot;&gt;&lt;div style=&quot;text-align:left;font-size:10px;line-height:1.4;&quot;&gt;• QuestionBank&lt;br&gt;• PassingThreshold (80%)&lt;br&gt;• ExamScore&lt;br&gt;• CertificateStatus&lt;/div&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e0e7ff;strokeColor=#6366f1;strokeWidth=2;align=center;shadow=1;fontSize=12;fontColor=#312e81;spacing=6;" vertex="1" parent="domain_canvas">
      <mxGeometry x="890" y="435" width="210" height="120" as="geometry" />
    </mxCell>

    <mxCell id="rel_user_role" value="gán vai trò" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#3b82f6;strokeWidth=1.5;fontColor=#1e3a8a;fontSize=10;" edge="1" parent="domain_canvas" source="ent_user" target="ent_role">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="card_user_role_src" value="0..*" style="edgeLabel;html=1;align=right;verticalAlign=bottom;fontSize=10;fontStyle=1;fontColor=#1e3a8a;" vertex="1" connectable="0" parent="rel_user_role">
      <mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint y="-5" as="offset"/></mxGeometry>
    </mxCell>
    <mxCell id="card_user_role_tgt" value="1" style="edgeLabel;html=1;align=left;verticalAlign=top;fontSize=10;fontStyle=1;fontColor=#1e3a8a;" vertex="1" connectable="0" parent="rel_user_role">
      <mxGeometry x="0.7" relative="1" as="geometry"><mxPoint y="5" as="offset"/></mxGeometry>
    </mxCell>

    <mxCell id="rel_user_recipe" value="sáng tạo" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#10b981;strokeWidth=1.5;fontColor=#065f46;fontSize=10;" edge="1" parent="domain_canvas" source="ent_user" target="ent_recipe">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="card_user_recipe_src" value="1" style="edgeLabel;html=1;align=left;verticalAlign=bottom;fontSize=10;fontStyle=1;fontColor=#065f46;" vertex="1" connectable="0" parent="rel_user_recipe">
      <mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint x="10" y="-8" as="offset"/></mxGeometry>
    </mxCell>
    <mxCell id="card_user_recipe_tgt" value="0..*" style="edgeLabel;html=1;align=right;verticalAlign=bottom;fontSize=10;fontStyle=1;fontColor=#065f46;" vertex="1" connectable="0" parent="rel_user_recipe">
      <mxGeometry x="0.7" relative="1" as="geometry"><mxPoint x="-10" y="-8" as="offset"/></mxGeometry>
    </mxCell>

    <mxCell id="rel_recipe_version" value="quản lý phiên bản" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#059669;strokeWidth=2;fontColor=#064e3b;fontSize=11;fontStyle=1;" edge="1" parent="domain_canvas" source="ent_recipe" target="ent_version">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="card_rec_ver_src" value="1" style="edgeLabel;html=1;align=left;verticalAlign=bottom;fontSize=11;fontStyle=1;fontColor=#064e3b;" vertex="1" connectable="0" parent="rel_recipe_version">
      <mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint x="10" y="-8" as="offset"/></mxGeometry>
    </mxCell>
    <mxCell id="card_rec_ver_tgt" value="1..*&#xa;[BR-02]" style="edgeLabel;html=1;align=right;verticalAlign=bottom;fontSize=10;fontStyle=1;fontColor=#b91c1c;" vertex="1" connectable="0" parent="rel_recipe_version">
      <mxGeometry x="0.7" relative="1" as="geometry"><mxPoint x="-15" y="-12" as="offset"/></mxGeometry>
    </mxCell>

    <mxCell id="rel_version_yield" value="định mức" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#10b981;strokeWidth=1.5;fontColor=#065f46;fontSize=10;" edge="1" parent="domain_canvas" source="ent_version" target="ent_yield">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="card_ver_yield_src" value="1" style="edgeLabel;html=1;align=right;verticalAlign=bottom;fontSize=10;fontStyle=1;fontColor=#065f46;" vertex="1" connectable="0" parent="rel_version_yield">
      <mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint y="-5" as="offset"/></mxGeometry>
    </mxCell>
    <mxCell id="card_ver_yield_tgt" value="1&#xa;[BR-05]" style="edgeLabel;html=1;align=left;verticalAlign=top;fontSize=10;fontStyle=1;fontColor=#b91c1c;" vertex="1" connectable="0" parent="rel_version_yield">
      <mxGeometry x="0.7" relative="1" as="geometry"><mxPoint y="5" as="offset"/></mxGeometry>
    </mxCell>

    <mxCell id="rel_version_rec_ing" value="thành phần định lượng" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#f59e0b;strokeWidth=2;fontColor=#92400e;fontSize=11;fontStyle=1;" edge="1" parent="domain_canvas" source="ent_version" target="ent_rec_ing">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="card_ver_ing_src" value="1" style="edgeLabel;html=1;align=left;verticalAlign=bottom;fontSize=11;fontStyle=1;fontColor=#92400e;" vertex="1" connectable="0" parent="rel_version_rec_ing">
      <mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint x="10" y="-8" as="offset"/></mxGeometry>
    </mxCell>
    <mxCell id="card_ver_ing_tgt" value="1..*&#xa;[BR-01]" style="edgeLabel;html=1;align=right;verticalAlign=bottom;fontSize=10;fontStyle=1;fontColor=#b91c1c;" vertex="1" connectable="0" parent="rel_version_rec_ing">
      <mxGeometry x="0.7" relative="1" as="geometry"><mxPoint x="-15" y="-12" as="offset"/></mxGeometry>
    </mxCell>

    <mxCell id="rel_version_step" value="trình tự thực hiện" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#f59e0b;strokeWidth=1.5;fontColor=#92400e;fontSize=10;" edge="1" parent="domain_canvas" source="ent_version" target="ent_step">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="card_ver_step_src" value="1" style="edgeLabel;html=1;align=right;verticalAlign=bottom;fontSize=10;fontStyle=1;fontColor=#92400e;" vertex="1" connectable="0" parent="rel_version_step">
      <mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint y="-5" as="offset"/></mxGeometry>
    </mxCell>
    <mxCell id="card_ver_step_tgt" value="1..*&#xa;[BR-01]" style="edgeLabel;html=1;align=right;verticalAlign=top;fontSize=10;fontStyle=1;fontColor=#b91c1c;" vertex="1" connectable="0" parent="rel_version_step">
      <mxGeometry x="0.7" relative="1" as="geometry"><mxPoint y="5" as="offset"/></mxGeometry>
    </mxCell>

    <mxCell id="rel_step_media" value="gắn ảnh SOP" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#f59e0b;strokeWidth=1.5;fontColor=#92400e;fontSize=10;" edge="1" parent="domain_canvas" source="ent_step" target="ent_step_media">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="card_step_media_src" value="1" style="edgeLabel;html=1;align=right;verticalAlign=bottom;fontSize=10;fontStyle=1;fontColor=#92400e;" vertex="1" connectable="0" parent="rel_step_media">
      <mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint y="-5" as="offset"/></mxGeometry>
    </mxCell>
    <mxCell id="card_step_media_tgt" value="0..*&#xa;[BR-05]" style="edgeLabel;html=1;align=right;verticalAlign=top;fontSize=10;fontStyle=1;fontColor=#b91c1c;" vertex="1" connectable="0" parent="rel_step_media">
      <mxGeometry x="0.7" relative="1" as="geometry"><mxPoint y="5" as="offset"/></mxGeometry>
    </mxCell>

    <mxCell id="rel_ing_rec_ing" value="tham chiếu danh mục" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#a855f7;strokeWidth=1.5;fontColor=#581c87;fontSize=10;" edge="1" parent="domain_canvas" source="ent_ingredient" target="ent_rec_ing">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="card_ing_src" value="1" style="edgeLabel;html=1;align=right;verticalAlign=bottom;fontSize=10;fontStyle=1;fontColor=#581c87;" vertex="1" connectable="0" parent="rel_ing_rec_ing">
      <mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint x="-10" y="-8" as="offset"/></mxGeometry>
    </mxCell>
    <mxCell id="card_ing_tgt" value="0..*" style="edgeLabel;html=1;align=left;verticalAlign=bottom;fontSize=10;fontStyle=1;fontColor=#581c87;" vertex="1" connectable="0" parent="rel_ing_rec_ing">
      <mxGeometry x="0.7" relative="1" as="geometry"><mxPoint x="10" y="-8" as="offset"/></mxGeometry>
    </mxCell>

    <mxCell id="rel_cat_ing" value="phân loại" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#a855f7;strokeWidth=1.5;fontColor=#581c87;fontSize=10;" edge="1" parent="domain_canvas" source="ent_category" target="ent_ingredient">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="card_cat_src" value="1" style="edgeLabel;html=1;align=right;verticalAlign=top;fontSize=10;fontStyle=1;fontColor=#581c87;" vertex="1" connectable="0" parent="rel_cat_ing">
      <mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint y="5" as="offset"/></mxGeometry>
    </mxCell>
    <mxCell id="card_cat_tgt" value="0..*" style="edgeLabel;html=1;align=right;verticalAlign=bottom;fontSize=10;fontStyle=1;fontColor=#581c87;" vertex="1" connectable="0" parent="rel_cat_ing">
      <mxGeometry x="0.7" relative="1" as="geometry"><mxPoint y="-5" as="offset"/></mxGeometry>
    </mxCell>

    <mxCell id="rel_ver_incident" value="truy vết chất lượng" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#ef4444;strokeWidth=1.5;fontColor=#7f1d1d;fontSize=10;" edge="1" parent="domain_canvas" source="ent_version" target="ent_incident">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="card_inc_src" value="1" style="edgeLabel;html=1;align=left;verticalAlign=top;fontSize=10;fontStyle=1;fontColor=#7f1d1d;" vertex="1" connectable="0" parent="rel_ver_incident">
      <mxGeometry x="-0.7" relative="1" as="geometry"><mxPoint x="10" y="5" as="offset"/></mxGeometry>
    </mxCell>
    <mxCell id="card_inc_tgt" value="0..*&#xa;[BR-07]" style="edgeLabel;html=1;align=right;verticalAlign=bottom;fontSize=10;fontStyle=1;fontColor=#b91c1c;" vertex="1" connectable="0" parent="rel_ver_incident">
      <mxGeometry x="0.7" relative="1" as="geometry"><mxPoint x="-10" y="-8" as="offset"/></mxGeometry>
    </mxCell>

    <mxCell id="rel_ver_quiz" value="kiểm tra SOP" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#6366f1;strokeWidth=1.5;fontColor=#312e81;fontSize=10;" edge="1" parent="domain_canvas" source="ent_version" target="ent_quiz">
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="830" y="160" />
          <mxPoint x="830" y="495" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell id="card_quiz_src" value="1" style="edgeLabel;html=1;align=left;verticalAlign=bottom;fontSize=10;fontStyle=1;fontColor=#312e81;" vertex="1" connectable="0" parent="rel_ver_quiz">
      <mxGeometry x="-0.8" relative="1" as="geometry"><mxPoint x="10" y="-8" as="offset"/></mxGeometry>
    </mxCell>
    <mxCell id="card_quiz_tgt" value="0..*&#xa;[BR-06]" style="edgeLabel;html=1;align=right;verticalAlign=bottom;fontSize=10;fontStyle=1;fontColor=#b91c1c;" vertex="1" connectable="0" parent="rel_ver_quiz">
      <mxGeometry x="0.8" relative="1" as="geometry"><mxPoint x="-10" y="-8" as="offset"/></mxGeometry>
    </mxCell>

    <mxCell id="br_container" value="&lt;b&gt;QUY TẮC NGHIỆP VỤ CHI PHỐI QUAN HỆ DỮ LIỆU (BUSINESS RULES [BR-01..07])&lt;/b&gt;&lt;br&gt;&lt;span style=&quot;font-size:10px;color:#475569;font-weight:normal;&quot;&gt;Được kế thừa và tái sử dụng nhất quán từ Business Flow (Slide 07) đến Test Cases (Slide 21/22)&lt;/span&gt;" style="swimlane;startSize=28;rounded=1;arcSize=4;html=1;fillColor=#f8fafc;strokeColor=#475569;strokeWidth=1.5;fontColor=#0f172a;fontSize=11;fontStyle=1;shadow=1;collapsible=0;" vertex="1" parent="1">
      <mxGeometry x="40" y="680" width="1520" height="235" as="geometry" />
    </mxCell>

    <mxCell id="br_col1" value="&lt;table style=&quot;width:100%;font-size:10.5px;color:#1e293b;border-collapse:collapse;&quot;&gt;&lt;tr style=&quot;border-bottom:1px solid #e2e8f0;&quot;&gt;&lt;td style=&quot;padding:4px;width:75px;&quot;&gt;&lt;b style=&quot;color:#dc2626;&quot;&gt;[BR-01]&lt;/b&gt;&lt;/td&gt;&lt;td style=&quot;padding:4px;&quot;&gt;&lt;b&gt;Ràng buộc toàn vẹn thành phần &amp; quy trình:&lt;/b&gt; Một RecipeVersion hợp lệ để nộp duyệt bắt buộc phải có ít nhất &lt;b&gt;1 RecipeStep&lt;/b&gt; và &lt;b&gt;1 RecipeIngredient&lt;/b&gt; với Quantity &gt; 0.&lt;/td&gt;&lt;/tr&gt;&lt;tr style=&quot;border-bottom:1px solid #e2e8f0;&quot;&gt;&lt;td style=&quot;padding:4px;&quot;&gt;&lt;b style=&quot;color:#dc2626;&quot;&gt;[BR-02]&lt;/b&gt;&lt;/td&gt;&lt;td style=&quot;padding:4px;&quot;&gt;&lt;b&gt;Singleton Active Draft:&lt;/b&gt; Một Recipe tại một thời điểm chỉ được phép có tối đa &lt;b&gt;1 bản ghi trạng thái Draft&lt;/b&gt; đang hiệu chỉnh để chống phân mảnh lịch sử R&amp;D.&lt;/td&gt;&lt;/tr&gt;&lt;tr style=&quot;border-bottom:1px solid #e2e8f0;&quot;&gt;&lt;td style=&quot;padding:4px;&quot;&gt;&lt;b style=&quot;color:#dc2626;&quot;&gt;[BR-03]&lt;/b&gt;&lt;/td&gt;&lt;td style=&quot;padding:4px;&quot;&gt;&lt;b&gt;Duy nhất 1 phiên bản Published vận hành:&lt;/b&gt; Mỗi Recipe chỉ có đúng &lt;b&gt;1 RecipeVersion ở trạng thái Published&lt;/b&gt; đang có hiệu lực phục vụ pha chế trên toàn chuỗi.&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td style=&quot;padding:4px;&quot;&gt;&lt;b style=&quot;color:#dc2626;&quot;&gt;[BR-04]&lt;/b&gt;&lt;/td&gt;&lt;td style=&quot;padding:4px;&quot;&gt;&lt;b&gt;Khóa bất biến vĩnh viễn (Immutability Lock):&lt;/b&gt; Ngay khi chuyển sang trạng thái &lt;b&gt;Published&lt;/b&gt;, RecipeVersion bị đóng băng tuyệt đối (Read-only), cấm mọi thao tác UPDATE/DELETE trực tiếp.&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#e2e8f0;align=left;verticalAlign=top;spacing=6;shadow=0;" vertex="1" parent="br_container">
      <mxGeometry x="20" y="38" width="720" height="180" as="geometry" />
    </mxCell>

    <mxCell id="br_col2" value="&lt;table style=&quot;width:100%;font-size:10.5px;color:#1e293b;border-collapse:collapse;&quot;&gt;&lt;tr style=&quot;border-bottom:1px solid #e2e8f0;&quot;&gt;&lt;td style=&quot;padding:4px;width:75px;&quot;&gt;&lt;b style=&quot;color:#dc2626;&quot;&gt;[BR-05]&lt;/b&gt;&lt;/td&gt;&lt;td style=&quot;padding:4px;&quot;&gt;&lt;b&gt;Bắt buộc định mức sản lượng đầu ra:&lt;/b&gt; Mỗi RecipeVersion phải liên kết đúng &lt;b&gt;1 RecipeYield&lt;/b&gt; (StandardQuantity &gt; 0, Unit hợp lệ) để làm căn cứ tính toán chi phí và chuẩn hóa pha chế.&lt;/td&gt;&lt;/tr&gt;&lt;tr style=&quot;border-bottom:1px solid #e2e8f0;&quot;&gt;&lt;td style=&quot;padding:4px;&quot;&gt;&lt;b style=&quot;color:#dc2626;&quot;&gt;[BR-06]&lt;/b&gt;&lt;/td&gt;&lt;td style=&quot;padding:4px;&quot;&gt;&lt;b&gt;Ngưỡng chứng nhận Barista:&lt;/b&gt; Bài kiểm tra SOP Quiz bắt buộc Barista đạt điểm &lt;b&gt;&amp;ge; 80%&lt;/b&gt; mới được cấp chứng chỉ cho phép thực hiện công thức tại cửa hàng.&lt;/td&gt;&lt;/tr&gt;&lt;tr style=&quot;border-bottom:1px solid #e2e8f0;&quot;&gt;&lt;td style=&quot;padding:4px;&quot;&gt;&lt;b style=&quot;color:#dc2626;&quot;&gt;[BR-07]&lt;/b&gt;&lt;/td&gt;&lt;td style=&quot;padding:4px;&quot;&gt;&lt;b&gt;Khả năng truy vết sự cố chất lượng:&lt;/b&gt; Mọi IncidentReport do Barista gửi về từ quầy bar bắt buộc phải gắn với &lt;b&gt;RecipeVersion đang Published&lt;/b&gt; tại thời điểm xảy ra sự cố.&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td style=&quot;padding:4px;&quot;&gt;&lt;b style=&quot;color:#2563eb;&quot;&gt;[NOTE]&lt;/b&gt;&lt;/td&gt;&lt;td style=&quot;padding:4px;&quot;&gt;&lt;b&gt;Độc lập Microservices (Clean Architecture):&lt;/b&gt; Không tạo Foreign Key vật lý liên database. Quan hệ liên dịch vụ được duy trì thông qua các UUID logic ổn định (&lt;i&gt;PublicId&lt;/i&gt;).&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#e2e8f0;align=left;verticalAlign=top;spacing=6;shadow=0;" vertex="1" parent="br_container">
      <mxGeometry x="760" y="38" width="740" height="180" as="geometry" />
    </mxCell>

    <mxCell id="compliance_warn" value="&lt;b style=&quot;color:#b91c1c;&quot;&gt;ĐIỂM CHẾT CẦN TRÁNH (SLIDE 14 COMPLIANCE):&lt;/b&gt; Sơ đồ mô hình khái niệm chỉ thể hiện ý niệm thực thể, quan hệ cardinality và quy tắc nghiệp vụ. Tuyệt đối KHÔNG đưa kiểu dữ liệu vật lý (VARCHAR, INT, BIGINT, UUID, Primary Key) vào sơ đồ này để tránh bị trừ điểm nhầm lẫn giữa mô hình khái niệm và vật lý." style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fef2f2;strokeColor=#f87171;strokeWidth=1.5;align=center;shadow=0;fontSize=11;fontColor=#991b1b;spacing=4;" vertex="1" parent="1">
      <mxGeometry x="40" y="930" width="1520" height="40" as="geometry" />
    </mxCell>

  </root>
</mxGraphModel>`;

const baseMaterials = path.resolve('D:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/docs/materials');
const baseDiagrams = path.resolve('D:/03_Dev/01_Projects/01_MyProject/PRN232/Assignment/Project/RecipeHub/docs/diagrams');

fs.writeFileSync(path.join(baseMaterials, 'conceptual-erd.drawio'), xmlWithoutComments, 'utf8');
fs.writeFileSync(path.join(baseDiagrams, 'conceptual-erd.drawio'), xmlWithoutComments, 'utf8');
console.log('Updated conceptual-erd.drawio with clean XML!');
