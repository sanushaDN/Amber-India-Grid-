import sys

def read_pdf(file_path):
    try:
        import fitz
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        print(f"--- CONTENT OF {file_path} ---")
        print(text)
    except ImportError:
        try:
            import PyPDF2
            with open(file_path, "rb") as file:
                reader = PyPDF2.PdfReader(file)
                text = ""
                for page in reader.pages:
                    text += page.extract_text()
                print(f"--- CONTENT OF {file_path} ---")
                print(text)
        except ImportError:
            print("NEITHER PyMuPDF NOR PyPDF2 INSTALLED")
        except Exception as e:
            print(f"PyPDF2 ERROR: {e}")
    except Exception as e:
        print(f"PyMuPDF ERROR: {e}")

read_pdf("C:\\Users\\USER\\Documents\\AMBER-Project\\INTERNSHIP REPORT - Content format.docx.pdf")
read_pdf("C:\\Users\\USER\\Documents\\AMBER-Project\\Front sheets-internshipReport-Format.docx.pdf")
