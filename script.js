const uploadArea = document.getElementById('upload-area');
const pdfUpload = document.getElementById('pdf-upload');
const statusArea = document.getElementById('status-area');
const statusText = document.getElementById('status-text');
const resultArea = document.getElementById('result-area');
const markdownOutput = document.getElementById('markdown-output');
const downloadBtn = document.getElementById('download-btn');

// IMPORTANT: Replace this with the URL of your deployed backend function
const BACKEND_URL = 'https://backend-easy-ocr.vercel.app/api/process';

// --- Event Listeners ---
uploadArea.addEventListener('click', () => pdfUpload.click());
pdfUpload.addEventListener('change', handleFileSelect);

// Drag and drop listeners
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.backgroundColor = '#f0f8ff';
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.backgroundColor = 'transparent';
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.backgroundColor = 'transparent';
    const files = e.dataTransfer.files;
    if (files.length) {
        handleFile(files[0]);
    }
});

function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length) {
        handleFile(files[0]);
    }
}

async function handleFile(file) {
    if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
    }

    // Show processing state
    uploadArea.style.display = 'none';
    statusArea.style.display = 'block';
    resultArea.style.display = 'none';
    statusText.innerText = 'Processing your document... this may take a moment.';

    // Prepare data to send
    const formData = new FormData();
    formData.append('pdf_file', file);

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Something went wrong on the server.');
        }

        const data = await response.json();
        
        // Show result
        markdownOutput.value = data.markdown_content;
        statusArea.style.display = 'none';
        resultArea.style.display = 'block';

        // Set up download button
        downloadBtn.onclick = () => {
            download(data.markdown_content, `${file.name.replace('.pdf', '')}.md`, 'text/markdown');
        };

    } catch (error) {
        console.error('Error:', error);
        statusText.innerText = `An error occurred: ${error.message}`;
    }
}

// Download utility function
function download(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}
