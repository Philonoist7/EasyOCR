// --- CONFIGURATION ---
const BACKEND_URL = 'https://backend-easy-ocr.vercel.app/api/process';
const FREE_TIER_LIMIT_MB = 4.5;

// --- DOM ELEMENTS ---
const uploadSection = document.getElementById('upload-section');
const uploadArea = document.getElementById('upload-area');
const pdfUpload = document.getElementById('pdf-upload');

const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const filePages = document.getElementById('file-pages');
const fileWarning = document.getElementById('file-warning');
const processBtn = document.getElementById('process-btn');

const statusArea = document.getElementById('status-area');
const statusText = document.getElementById('status-text');
const timerDisplay = document.getElementById('timer');

const resultArea = document.getElementById('result-area');
const markdownOutput = document.getElementById('markdown-output');
const downloadMdBtn = document.getElementById('download-md');
const downloadDocxBtn = document.getElementById('download-docx');
const downloadPdfBtn = document.getElementById('download-pdf');
const reloadBtn = document.getElementById('reload-btn');

const copyIdBtn = document.getElementById('copy-id-btn');
const supportIdInput = document.getElementById('support-id');

let currentFile = null;
let timerInterval = null;

// --- INITIALIZATION ---
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

// --- EVENT LISTENERS ---
uploadArea.addEventListener('click', () => pdfUpload.click());
pdfUpload.addEventListener('change', handleFileSelect);
processBtn.addEventListener('click', processFile);
reloadBtn.addEventListener('click', () => location.reload());
copyIdBtn.addEventListener('click', copySupportId);

uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.classList.add('active'); });
uploadArea.addEventListener('dragleave', (e) => { e.preventDefault(); e.currentTarget.classList.remove('active'); });
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('active');
    const files = e.dataTransfer.files;
    if (files.length) handleFile(files[0]);
});

function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length) handleFile(files[0]);
}

// --- CORE LOGIC ---

async function handleFile(file) {
    if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
    }
    currentFile = file;

    uploadArea.style.display = 'none';
    fileInfo.style.display = 'block';
    
    fileName.textContent = file.name;
    const sizeInMB = file.size / 1024 / 1024;
    fileSize.textContent = `${sizeInMB.toFixed(2)} MB`;
    filePages.textContent = '...counting';

    fileWarning.style.display = sizeInMB > FREE_TIER_LIMIT_MB ? 'flex' : 'none';

    try {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = async function() {
            const pdf = await pdfjsLib.getDocument(new Uint8Array(this.result)).promise;
            filePages.textContent = pdf.numPages;
        };
    } catch (error) {
        console.error("Error counting pages:", error);
        filePages.textContent = 'N/A';
    }
}

async function processFile() {
    if (!currentFile) return;

    uploadSection.style.display = 'none';
    statusArea.style.display = 'block';
    statusText.innerText = 'Processing your document...';
    startTimer();

    const formData = new FormData();
    formData.append('pdf_file', currentFile);

    try {
        const response = await fetch(BACKEND_URL, { method: 'POST', body: formData });
        stopTimer();
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'The server returned an error.');
        }
        const data = await response.json();
        
        markdownOutput.value = data.markdown_content;
        statusArea.style.display = 'none';
        resultArea.style.display = 'block';
        setupDownloadListeners(data.markdown_content, currentFile.name);
    } catch (error) {
        console.error('Error:', error);
        stopTimer();
        statusText.innerText = `An error occurred: ${error.message}`;
        timerDisplay.style.display = 'none';
    }
}

// --- HELPER FUNCTIONS ---

function startTimer() {
    let seconds = 0;
    timerDisplay.textContent = '00:00';
    timerInterval = setInterval(() => {
        seconds++;
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        timerDisplay.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function copySupportId() {
    supportIdInput.select();
    document.execCommand('copy');
    // Provide user feedback
    const originalText = copyIdBtn.innerHTML;
    copyIdBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
    setTimeout(() => {
        copyIdBtn.innerHTML = originalText;
    }, 2000);
}

function setupDownloadListeners(markdownContent, originalFileName) {
    const baseName = originalFileName.replace(/\.pdf$/i, '');
    const { jsPDF } = window.jspdf;

    downloadMdBtn.onclick = () => downloadAsText(markdownContent, `${baseName}.md`, 'text/markdown');
    
    downloadDocxBtn.onclick = async () => {
        const htmlContent = markdownContent.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br/>');
        const fileBuffer = await htmlToDocx.asBlob(`<div dir="rtl">${htmlContent}</div>`);
        downloadAsBlob(fileBuffer, `${baseName}.docx`);
    };

    downloadPdfBtn.onclick = () => {
        const doc = new jsPDF();
        doc.setFont('Helvetica');
        doc.setR2L(true);
        const lines = doc.splitTextToSize(markdownContent, 180);
        doc.text(lines, 200, 10, { align: 'right' });
        doc.save(`${baseName}_converted.pdf`);
    };
}

function downloadAsText(content, fileName) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

function downloadAsBlob(blob, fileName) {
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
