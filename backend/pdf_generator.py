from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
import io
import os

# ─── Türkçe karakter desteği için Windows sistem fontlarını kaydet ───
_fonts_registered = False

def _register_fonts():
    global _fonts_registered
    if _fonts_registered:
        return
    
    # Windows font dizini
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
            # Fallback: DejaVu varsa onu dene
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
    # Firma bilgileri (ayarlardan gelecek)
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
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm)

    title_style = ParagraphStyle(
        "InvoiceTitle", fontSize=22, textColor=colors.HexColor("#1a1a2e"),
        alignment=TA_CENTER, spaceAfter=4, fontName=FONT_BOLD
    )
    subtitle_style = ParagraphStyle(
        "InvoiceSubtitle", fontSize=10, textColor=colors.HexColor("#666666"),
        alignment=TA_CENTER, spaceAfter=16, fontName=FONT
    )
    label_style = ParagraphStyle(
        "Label", fontSize=9, textColor=colors.HexColor("#888888"), fontName=FONT
    )
    value_style = ParagraphStyle(
        "Value", fontSize=10, textColor=colors.HexColor("#1a1a2e"), fontName=FONT_BOLD
    )
    normal_style = ParagraphStyle(
        "Normal", fontSize=9, textColor=colors.HexColor("#333333"), fontName=FONT
    )

    elements = []

    # ─── Firma Bilgileri (sağ üst) ───
    if company_name:
        company_style = ParagraphStyle("CompanyName", fontSize=14, fontName=FONT_BOLD,
                                        textColor=colors.HexColor("#1a1a2e"), alignment=TA_CENTER)
        company_detail = ParagraphStyle("CompanyDetail", fontSize=8, fontName=FONT,
                                         textColor=colors.HexColor("#666666"), alignment=TA_CENTER)
        elements.append(Paragraph(company_name, company_style))
        details = []
        if company_address:
            details.append(company_address)
        if company_phone:
            details.append(f"Tel: {company_phone}")
        if company_tax_office and company_tax_number:
            details.append(f"VD: {company_tax_office} / VN: {company_tax_number}")
        if details:
            elements.append(Paragraph(" | ".join(details), company_detail))
        elements.append(Spacer(1, 6*mm))

    # ─── Başlık ───
    elements.append(Paragraph("FATURA", title_style))
    elements.append(Paragraph(invoice_number, subtitle_style))
    elements.append(Spacer(1, 3*mm))

    # ─── Müşteri bilgileri tablosu ───
    customer_data = [
        [Paragraph("Müşteri", label_style), Paragraph(customer_name, value_style),
         Paragraph("Fatura Tarihi", label_style), Paragraph(created_at.strftime("%d.%m.%Y %H:%M"), value_style)],
        [Paragraph("Adres", label_style), Paragraph(customer_address, normal_style),
         Paragraph("Vergi Dairesi", label_style), Paragraph(customer_tax_office, normal_style)],
        [Paragraph("Telefon", label_style), Paragraph(customer_phone, normal_style),
         Paragraph("Vergi No", label_style), Paragraph(customer_tax_number, normal_style)],
        [Paragraph("Plaka", label_style), Paragraph(customer_plate, value_style),
         Paragraph("", label_style), Paragraph("", normal_style)],
    ]

    customer_table = Table(customer_data, colWidths=[70, 170, 80, 170])
    customer_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(customer_table)
    elements.append(Spacer(1, 8*mm))

    # ─── Ürün tablosu ───
    header_style = ParagraphStyle(
        "TableHeader", fontSize=9, textColor=colors.white, fontName=FONT_BOLD
    )
    cell_style = ParagraphStyle("TableCell", fontSize=9, fontName=FONT)
    cell_right = ParagraphStyle("TableCellRight", fontSize=9, alignment=TA_RIGHT, fontName=FONT)

    table_data = [[
        Paragraph("#", header_style),
        Paragraph("Ürün Adı", header_style),
        Paragraph("Miktar", header_style),
        Paragraph("Birim Fiyat", header_style),
        Paragraph("Toplam", header_style),
    ]]

    for i, item in enumerate(items, 1):
        table_data.append([
            Paragraph(str(i), cell_style),
            Paragraph(item["product_name"], cell_style),
            Paragraph(str(item["quantity"]), cell_right),
            Paragraph(f'{item["unit_price"]:.2f} TL', cell_right),
            Paragraph(f'{item["total_price"]:.2f} TL', cell_right),
        ])

    product_table = Table(table_data, colWidths=[30, 210, 60, 90, 100])
    product_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e0e0e0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9fa")]),
    ]))
    elements.append(product_table)
    elements.append(Spacer(1, 6*mm))

    # ─── Toplam tablosu ───
    summary_style = ParagraphStyle("SummaryLabel", fontSize=10, fontName=FONT, alignment=TA_RIGHT)
    summary_bold = ParagraphStyle("SummaryBold", fontSize=13, fontName=FONT_BOLD, alignment=TA_RIGHT,
                                   textColor=colors.HexColor("#1a1a2e"))

    summary_data = [
        [Paragraph("Ara Toplam:", summary_style), Paragraph(f"{subtotal:.2f} TL", summary_style)],
        [Paragraph(f"İskonto (%{discount_rate}):", summary_style), Paragraph(f"-{discount_amount:.2f} TL", summary_style)],
        [Paragraph(f"KDV (%{kdv_rate}):", summary_style), Paragraph(f"+{kdv_amount:.2f} TL", summary_style)],
        [Paragraph("GENEL TOPLAM:", summary_bold), Paragraph(f"{total:.2f} TL", summary_bold)],
    ]

    summary_table = Table(summary_data, colWidths=[380, 110])
    summary_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LINEABOVE", (0, -1), (-1, -1), 1.5, colors.HexColor("#1a1a2e")),
    ]))
    elements.append(summary_table)

    doc.build(elements)
    return buffer.getvalue()
