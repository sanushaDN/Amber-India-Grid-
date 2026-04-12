import fitz

def extract(pdf_path, out_path):
    with fitz.open(pdf_path) as doc:
        text = "\n".join([page.get_text() for page in doc])
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(text)

extract("C:\\Users\\USER\\Documents\\AMBER-Project\\INTERNSHIP REPORT - Content format.docx.pdf", "C:\\Users\\USER\\Documents\\AMBER-Project\\content_format.txt")
extract("C:\\Users\\USER\\Documents\\AMBER-Project\\Front sheets-internshipReport-Format.docx.pdf", "C:\\Users\\USER\\Documents\\AMBER-Project\\front_sheets_format.txt")
