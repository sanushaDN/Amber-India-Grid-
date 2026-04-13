from docx import Document

def extract_text(docx_path, out_path):
    doc = Document(docx_path)
    fullText = []
    for para in doc.paragraphs:
        fullText.append(para.text)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(fullText))

try:
    extract_text("C:\\Users\\USER\\Documents\\AMBER-Project\\PARC_Internship_Report_varshini1.docx", "C:\\Users\\USER\\Documents\\AMBER-Project\\parc_extracted.txt")
    print("Extraction successful")
except Exception as e:
    print(f"Error: {e}")
