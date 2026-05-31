from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
from typing import Optional
import io
import os

_fonts_registered = False

def _register_fonts():
    global _fonts_registered
    if _fonts_registered:
        return
    
    font_dir = os.path.join(os.environ.get('WINDIR', 'C:\\Windows'), 'Fonts')
    
    font_map = {
        'Turkish': 'arial.ttf',
        'Turkish-Bold': 'arialbd.ttf',
        'Turkish-Italic': 'ariali.ttf',
    }
    
    for font_name, font_file in font_map.items():
        font_path = os.path.join(font_dir, font_file)
        if os.path.exists(font_path):
            pdfmetrics.registerFont(TTFont(font_name, font_path))
        else:
            fallback = os.path.join(os.path.dirname(__file__), 'DejaVuSans.ttf')
            if os.path.exists(fallback):
                pdfmetrics.registerFont(TTFont(font_name, fallback))
    
    _fonts_registered = True


def generate_invoice_pdf(
    invoice_number: str,
    customer_name: str,
    customer_address: str,
    customer_tax_office: str,
    customer_tax_number: str,
    customer_phone: str,
    customer_plate: str,
    items: list,
    subtotal: float,
    discount_rate: float,
    discount_amount: float,
    kdv_rate: float,
    kdv_amount: float,
    total: float,
    created_at: datetime,
    company_name: str = "",
    company_address: str = "",
    company_tax_office: str = "",
    company_tax_number: str = "",
    company_phone: str = "",
) -> bytes:
    _register_fonts()
    
    FONT = 'Turkish'
    FONT_BOLD = 'Turkish-Bold'
    
    buffer = io.BytesIO()
    # 20mm is roughly 56.7 points. Printable area on A4 is 481.89 points.
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=15*mm, rightMargin=15*mm, topMargin=15*mm, bottomMargin=15*mm)

    company_title_style = ParagraphStyle(
        "CompanyTitle", fontSize=14, fontName=FONT_BOLD, textColor=colors.HexColor("#4f46e5"),
        spaceAfter=4, leading=16
    )
    company_detail_style = ParagraphStyle(
        "CompanyDetail", fontSize=8, fontName=FONT, textColor=colors.HexColor("#4b5563"),
        leading=11
    )
    invoice_title_style = ParagraphStyle(
        "InvoiceTitle", fontSize=20, fontName=FONT_BOLD, textColor=colors.HexColor("#4f46e5"),
        alignment=TA_RIGHT, spaceAfter=6, leading=22
    )
    invoice_meta_style = ParagraphStyle(
        "InvoiceMeta", fontSize=9, fontName=FONT, textColor=colors.HexColor("#1f2937"),
        alignment=TA_RIGHT, leading=13
    )
    section_title_style = ParagraphStyle(
        "SectionTitle", fontSize=10, fontName=FONT_BOLD, textColor=colors.HexColor("#4f46e5"),
        spaceAfter=6, leading=12
    )
    label_style = ParagraphStyle(
        "Label", fontSize=8, textColor=colors.HexColor("#4b5563"), fontName=FONT, leading=11
    )
    value_style = ParagraphStyle(
        "Value", fontSize=9, textColor=colors.HexColor("#111827"), fontName=FONT_BOLD, leading=12
    )
    normal_style = ParagraphStyle(
        "Normal", fontSize=9, textColor=colors.HexColor("#1f2937"), fontName=FONT, leading=12
    )
    header_style = ParagraphStyle(
        "TableHeader", fontSize=9, textColor=colors.white, fontName=FONT_BOLD, leading=11
    )
    cell_style = ParagraphStyle(
        "TableCell", fontSize=9, fontName=FONT, textColor=colors.HexColor("#1f2937"), leading=12
    )
    cell_right = ParagraphStyle(
        "TableCellRight", fontSize=9, alignment=TA_RIGHT, fontName=FONT, textColor=colors.HexColor("#1f2937"), leading=12
    )
    summary_label_style = ParagraphStyle(
        "SummaryLabel", fontSize=9, fontName=FONT, textColor=colors.HexColor("#4b5563"), alignment=TA_RIGHT, leading=12
    )
    summary_value_style = ParagraphStyle(
        "SummaryValue", fontSize=9, fontName=FONT_BOLD, textColor=colors.HexColor("#111827"), alignment=TA_RIGHT, leading=12
    )
    summary_bold_style = ParagraphStyle(
        "SummaryBold", fontSize=12, fontName=FONT_BOLD, alignment=TA_RIGHT, textColor=colors.HexColor("#4f46e5"), leading=16
    )

    elements = []

    # Two-Column Header
    company_details_text = f"<b>{company_name or 'CNRStok Isletmesi'}</b><br/>"
    if company_address:
        company_details_text += f"{company_address}<br/>"
    if company_phone:
        company_details_text += f"Tel: {company_phone}<br/>"
    if company_tax_office and company_tax_number:
        company_details_text += f"VD: {company_tax_office} / VN: {company_tax_number}"
        
    company_paragraph = Paragraph(company_details_text, company_detail_style)
    # Wrap name separately with bold coloring
    if company_name:
        company_paragraph = Paragraph(f"<font size=14 color='#4f46e5'><b>{company_name}</b></font><br/>{company_address}<br/>Tel: {company_phone}<br/>VD: {company_tax_office} / VN: {company_tax_number}", company_detail_style)

    invoice_meta_text = f"<font size=20 color='#4f46e5'><b>FATURA</b></font><br/><br/><b>Fatura No:</b> {invoice_number}<br/><b>Tarih:</b> {created_at.strftime('%d.%m.%Y %H:%M')}"
    invoice_paragraph = Paragraph(invoice_meta_text, invoice_meta_style)

    # Printable width: A4 width is 595. Printable is 595 - 2*42.5 (15mm margins) = 510 points
    header_table = Table([[company_paragraph, invoice_paragraph]], colWidths=[310, 200])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(header_table)
    
    # Beautiful line separator
    line_table = Table([[""]], colWidths=[510])
    line_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 1.5, colors.HexColor("#4f46e5")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 4*mm))

    # Customer Card / Section
    elements.append(Paragraph("MÜŞTERİ BİLGİLERİ", section_title_style))
    
    customer_data = [
        [Paragraph("Müşteri Unvanı", label_style), Paragraph(customer_name, value_style),
         Paragraph("Fatura No", label_style), Paragraph(invoice_number, value_style)],
        [Paragraph("Adres", label_style), Paragraph(customer_address or "—", normal_style),
         Paragraph("Tarih", label_style), Paragraph(created_at.strftime("%d.%m.%Y %H:%M"), normal_style)],
        [Paragraph("Telefon", label_style), Paragraph(customer_phone or "—", normal_style),
         Paragraph("Vergi Dairesi", label_style), Paragraph(customer_tax_office or "—", normal_style)],
        [Paragraph("Araç Plakası", label_style), Paragraph(customer_plate, value_style),
         Paragraph("Vergi Numarası", label_style), Paragraph(customer_tax_number or "—", normal_style)]
    ]

    customer_table = Table(customer_data, colWidths=[80, 180, 80, 170])
    customer_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f9fafb")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#d1d5db")),
    ]))
    elements.append(customer_table)
    elements.append(Spacer(1, 5*mm))

    # Items list
    elements.append(Paragraph("FATURA KALEMLERİ", section_title_style))
    
    table_data = [[
        Paragraph("#", header_style),
        Paragraph("Ürün / Hizmet Açıklaması", header_style),
        Paragraph("Miktar", header_style),
        Paragraph("Birim Fiyat", header_style),
        Paragraph("Toplam Tutar", header_style),
    ]]

    for i, item in enumerate(items, 1):
        table_data.append([
            Paragraph(str(i), cell_style),
            Paragraph(item["product_name"], cell_style),
            Paragraph(str(item["quantity"]), cell_right),
            Paragraph(f'{item["unit_price"]:.2f} TL', cell_right),
            Paragraph(f'{item["total_price"]:.2f} TL', cell_right),
        ])

    # Sized to perfectly sum to 510 printable points
    product_table = Table(table_data, colWidths=[25, 235, 50, 95, 105])
    product_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4f46e5")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e5e7eb")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
    ]))
    elements.append(product_table)
    elements.append(Spacer(1, 4*mm))

    # Invoice Totals Summary Block
    summary_data = [
        [Paragraph("Ara Toplam:", summary_label_style), Paragraph(f"{subtotal:.2f} TL", summary_value_style)],
        [Paragraph(f"İskonto (%{discount_rate}):", summary_label_style), Paragraph(f"-{discount_amount:.2f} TL", summary_value_style)],
        [Paragraph(f"KDV (%{kdv_rate}):", summary_label_style), Paragraph(f"+{kdv_amount:.2f} TL", summary_value_style)],
        [Paragraph("GENEL TOPLAM:", summary_label_style), Paragraph(f"{total:.2f} TL", summary_bold_style)],
    ]

    summary_table = Table(summary_data, colWidths=[380, 130])
    summary_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#4f46e5")),
    ]))
    elements.append(summary_table)

    # Small Footer Notice
    elements.append(Spacer(1, 10*mm))
    footer_style = ParagraphStyle(
        "FooterNotice", fontSize=8, fontName=FONT, textColor=colors.HexColor("#9ca3af"), alignment=TA_CENTER
    )
    elements.append(Paragraph("CNRStok Fatura Yonetim Sistemi ile hazirlanmistir.", footer_style))

    doc.build(elements)
    return buffer.getvalue()


def generate_vehicle_pdf(
    reception_number: str,
    plate_number: str,
    owner_name: str,
    owner_phone: str,
    vehicle_brand: str,
    vehicle_model: str,
    vehicle_year: Optional[int],
    vehicle_color: Optional[str],
    km_reading: Optional[int],
    complaints: Optional[str],
    diagnosis: Optional[str],
    notes: Optional[str],
    received_at: datetime,
    company_name: str = "",
    company_address: str = "",
    company_tax_office: str = "",
    company_tax_number: str = "",
    company_phone: str = "",
    qr_token: Optional[str] = None,
    sharing_base_url: str = "http://localhost:8000"
) -> bytes:
    _register_fonts()
    
    FONT = 'Turkish'
    FONT_BOLD = 'Turkish-Bold'
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=15*mm, rightMargin=15*mm, topMargin=15*mm, bottomMargin=15*mm)

    company_detail_style = ParagraphStyle(
        "CompanyDetail", fontSize=8, fontName=FONT, textColor=colors.HexColor("#4b5563"),
        leading=11, alignment=TA_LEFT
    )
    form_meta_style = ParagraphStyle(
        "FormMeta", fontSize=9, fontName=FONT, textColor=colors.HexColor("#1f2937"),
        alignment=TA_RIGHT, leading=13
    )
    section_title_style = ParagraphStyle(
        "SectionTitle", fontSize=10, fontName=FONT_BOLD, textColor=colors.HexColor("#4f46e5"),
        spaceAfter=6, leading=12
    )
    label_style = ParagraphStyle(
        "Label", fontSize=8, textColor=colors.HexColor("#4b5563"), fontName=FONT, leading=11
    )
    value_style = ParagraphStyle(
        "Value", fontSize=9, textColor=colors.HexColor("#111827"), fontName=FONT_BOLD, leading=12
    )
    normal_style = ParagraphStyle(
        "Normal", fontSize=9, textColor=colors.HexColor("#1f2937"), fontName=FONT, leading=12
    )
    
    elements = []

    # Two-Column Header (Company Details on the left, Form Title and Meta on the right)
    shop_details_text = f"<font size=13 color='#4f46e5'><b>{company_name or 'CNRStok Servis Istasyonu'}</b></font><br/>"
    if company_address:
        shop_details_text += f"{company_address}<br/>"
    if company_phone:
        shop_details_text += f"Tel: {company_phone}<br/>"
    if company_tax_office and company_tax_number:
        shop_details_text += f"VD: {company_tax_office} / VN: {company_tax_number}"
        
    shop_paragraph = Paragraph(shop_details_text, company_detail_style)
    
    full_reception_number = f"KBL-{received_at.strftime('%Y%m%d')}-{reception_number}"
    form_meta_text = f"<font size=18 color='#4f46e5'><b>ARAC KABUL FORMU</b></font><br/><br/><b>Form No:</b> {full_reception_number}<br/><b>Kabul Tarihi:</b> {received_at.strftime('%d.%m.%Y %H:%M')}"
    form_paragraph = Paragraph(form_meta_text, form_meta_style)
    
    header_table = Table([[shop_paragraph, form_paragraph]], colWidths=[310, 200])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(header_table)

    # Line Separator
    line_table = Table([[""]], colWidths=[510])
    line_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 1.5, colors.HexColor("#4f46e5")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(line_table)
    elements.append(Spacer(1, 4*mm))

    # Müşteri ve Araç Bilgileri Grid
    elements.append(Paragraph("MUSTERI & ARAC BILGILERI", section_title_style))
    
    km_str = f"{km_reading:,} km" if km_reading else "—"
    grid_data = [
        [Paragraph("Musteri Adi", label_style), Paragraph(owner_name or "—", value_style),
         Paragraph("Arac Plakasi", label_style), Paragraph(plate_number, value_style)],
        [Paragraph("Musteri Tel", label_style), Paragraph(owner_phone or "—", normal_style),
         Paragraph("Marka / Model", label_style), Paragraph(f"{vehicle_brand or ''} {vehicle_model or ''}".strip() or "—", normal_style)],
        [Paragraph("Kabul Tarihi", label_style), Paragraph(received_at.strftime("%d.%m.%Y %H:%M"), normal_style),
         Paragraph("Arac Yili / Renk", label_style), Paragraph(f"{vehicle_year or '—'} / {vehicle_color or '—'}", normal_style)],
        [Paragraph("", label_style), Paragraph("", normal_style),
         Paragraph("Kilometre Okuma", label_style), Paragraph(km_str, value_style)]
    ]

    info_table = Table(grid_data, colWidths=[90, 170, 90, 160])
    info_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f9fafb")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#d1d5db")),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 5*mm))

    # Complaints Section
    elements.append(Paragraph("MUSTERI SIKAYETLERI & TALEPLERI", section_title_style))
    complaints_style = ParagraphStyle("ComplaintsPara", fontSize=9, fontName=FONT, textColor=colors.HexColor("#1f2937"), leading=13)
    complaints_box = Table([[Paragraph(complaints or "Belirtilmemis", complaints_style)]], colWidths=[510])
    complaints_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fffbeb")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#f59e0b")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    elements.append(complaints_box)
    elements.append(Spacer(1, 5*mm))

    # Diagnosis Section
    elements.append(Paragraph("ARIZA TESPIT & DIAGNOZ RAPORU", section_title_style))
    diagnosis_style = ParagraphStyle("DiagnosisPara", fontSize=9, fontName=FONT, textColor=colors.HexColor("#1f2937"), leading=13)
    diagnosis_box = Table([[Paragraph(diagnosis or "Henuz tani konulmamis", diagnosis_style)]], colWidths=[510])
    diagnosis_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eff6ff")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#3b82f6")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    elements.append(diagnosis_box)
    elements.append(Spacer(1, 5*mm))

    # Notes Section
    if notes:
        elements.append(Paragraph("EK NOTLAR", section_title_style))
        notes_box = Table([[Paragraph(notes, normal_style)]], colWidths=[510])
        notes_box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f9fafb")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))
        elements.append(notes_box)
        elements.append(Spacer(1, 6*mm))

    # Live QR Code Share Section
    if qr_token:
        from reportlab.graphics.barcode.qr import QrCodeWidget
        from reportlab.graphics.shapes import Drawing

        qr_url = f"{sharing_base_url}/shared/vehicle/{qr_token}"
        qr_widget = QrCodeWidget(qr_url)
        qr_widget.barWidth = 1.8
        qr_widget.barHeight = 1.8
        qr_drawing = Drawing(75, 75)
        qr_drawing.add(qr_widget)

        qr_desc_style = ParagraphStyle("QRDesc", fontSize=7.5, fontName=FONT, textColor=colors.HexColor("#4b5563"), leading=10)
        qr_text_block = Paragraph(
            "<font color='#4f46e5'><b>ARAC TAKIP VE SERVIS GECMISI</b></font><br/>"
            "Aracinizin anlik durumunu, teknisyen ariza tespitlerini ve servis gecmisini "
            "dilediginiz an cep telefonunuzdan sifresiz ve aninda takip etmek icin yandaki QR kodu okutabilirsiniz.",
            qr_desc_style
        )

        qr_table = Table([[qr_text_block, qr_drawing]], colWidths=[420, 90])
        qr_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f3f4f6")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))
        elements.append(qr_table)
        elements.append(Spacer(1, 5*mm))

    # Terms & Signature Block
    elements.append(Spacer(1, 5*mm))
    terms_style = ParagraphStyle("TermsPara", fontSize=7.5, fontName=FONT, textColor=colors.HexColor("#6b7280"), leading=10, alignment=TA_CENTER)
    elements.append(Paragraph("Yukarida belirtilen arac bilgilerinin dogrulugunu, sikayet ve ariza tespit sureclerini kabul ediyorum.<br/>Aracin servise teslim edildigi andaki durumu ve yukaridaki beyanlar esastir.", terms_style))
    elements.append(Spacer(1, 10*mm))

    # Signatures Table
    sig_label_style = ParagraphStyle("SigLabel", fontSize=9, fontName=FONT_BOLD, textColor=colors.HexColor("#111827"), alignment=TA_CENTER)
    signatures_data = [
        [Paragraph("Teslim Eden (Musteri)<br/><br/><br/>Imza: _______________________", sig_label_style),
         Paragraph("Teslim Alan (Servis Yetkilisi)<br/><br/><br/>Imza: _______________________", sig_label_style)]
    ]
    signatures_table = Table(signatures_data, colWidths=[255, 255])
    signatures_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    elements.append(signatures_table)

    # Footer
    elements.append(Spacer(1, 8*mm))
    footer_style = ParagraphStyle(
        "FooterNotice", fontSize=8, fontName=FONT, textColor=colors.HexColor("#9ca3af"), alignment=TA_CENTER
    )
    elements.append(Paragraph("CNRStok Arac Kabul Modulu ile hazirlanmistir.", footer_style))

    doc.build(elements)
    return buffer.getvalue()
