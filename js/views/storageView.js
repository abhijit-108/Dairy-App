// ============================================================
// STORAGE (OLD BILLS PHOTOS) VIEW CONTROLLER (SPA)
// Appwrite File Storage with Drag-and-Drop & Infinite Scroll
// ============================================================

import { Client, Storage, ID, Query } from "https://cdn.jsdelivr.net/npm/appwrite@23.0.0/+esm";
import { pad2 } from '../utils.js';

let storageInitialized = false;

const appwriteConfig = {
    endpoint: 'https://nyc.cloud.appwrite.io/v1',
    project: '69ba34d0002986608c9c',
    bucket: '69c40e2b000dd3147211'
};

const client = new Client();
client.setEndpoint(appwriteConfig.endpoint).setProject(appwriteConfig.project);
const storage = new Storage(client);

let allItems = [];
let currentIndex = 0;
const itemsPerLoad = 6;
let isLoading = false;
let pendingFile = null;
let pendingFileName = null;
let pendingExistingFileId = null;

export function initStorageView() {
    populateYears();
    setupDropzone();
    setupUploadHandler();
    setupOverwriteModal();
    setupPhotoViewerModal();
    setupInfiniteScroll();

    fetchStorageFiles();
    storageInitialized = true;
}

export function activateStorageView() {
    if (!storageInitialized) {
        initStorageView();
    } else if (allItems.length === 0 && !isLoading) {
        fetchStorageFiles();
    }
}

function populateYears() {
    const yearSelect = document.getElementById('storageYearSelect');
    if (!yearSelect) return;

    yearSelect.innerHTML = '';
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }

    const monthSelect = document.getElementById('storageMonthSelect');
    if (monthSelect) {
        monthSelect.value = pad2(new Date().getMonth() + 1);
    }
}

function setupDropzone() {
    const dropzone = document.getElementById('storageContentBox');
    const fileInput = document.getElementById('storageFileInput');
    if (!dropzone || !fileInput) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });

    dropzone.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            const status = document.getElementById('storageUploadStatus');
            if (status) status.textContent = 'Selected: ' + files[0].name;
        }
    });
}

function setupUploadHandler() {
    const uploadBtn = document.getElementById('storageUploadBtn');
    if (!uploadBtn) return;

    uploadBtn.addEventListener('click', async () => {
        const fileInput = document.getElementById('storageFileInput');
        const monthSelect = document.getElementById('storageMonthSelect');
        const yearSelect = document.getElementById('storageYearSelect');
        const commentSelect = document.getElementById('storageCommentInput');
        const statusEl = document.getElementById('storageUploadStatus');

        if (!fileInput || fileInput.files.length === 0) {
            alert('Please select a photo file to upload.');
            return;
        }

        const file = fileInput.files[0];
        const month = monthSelect.value;
        const year = yearSelect.value;
        const rangeTemplate = commentSelect.value;

        const rangeStr = rangeTemplate.replace(/currentmonth/g, month).replace(/currentyear/g, year);
        const fileName = `${rangeStr}.${file.name.split('.').pop()}`;

        // Check if file with same name exists
        try {
            if (statusEl) statusEl.textContent = 'Checking existing records...';
            const response = await storage.listFiles(appwriteConfig.bucket, [
                Query.equal('name', fileName)
            ]);

            if (response.files.length > 0) {
                // Show overwrite modal
                pendingFile = file;
                pendingFileName = fileName;
                pendingExistingFileId = response.files[0].$id;
                showOverwriteModal(response.files[0]);
                return;
            }

            performUpload(file, fileName);
        } catch (err) {
            console.error('Error checking file existance:', err);
            performUpload(file, fileName);
        }
    });
}

async function performUpload(file, fileName, oldFileIdToDelete = null) {
    const statusEl = document.getElementById('storageUploadStatus');
    const progressBar = document.getElementById('storageProgressBar');
    const progressFill = document.getElementById('storageProgress');
    const speedEl = document.getElementById('storageUploadSpeed');
    const uploadBtn = document.getElementById('storageUploadBtn');

    if (uploadBtn) uploadBtn.disabled = true;
    if (progressBar) progressBar.style.display = 'block';
    if (progressFill) progressFill.style.width = '0%';
    if (statusEl) statusEl.textContent = 'Uploading...';

    const startTime = Date.now();

    try {
        if (oldFileIdToDelete) {
            try {
                await storage.deleteFile(appwriteConfig.bucket, oldFileIdToDelete);
            } catch (e) {
                console.warn('Could not delete old file:', e);
            }
        }

        const renamedFile = new File([file], fileName, { type: file.type });
        const res = await storage.createFile(
            appwriteConfig.bucket,
            ID.unique(),
            renamedFile,
            [],
            (progress) => {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                if (progressFill) progressFill.style.width = percent + '%';
                const elapsedSec = (Date.now() - startTime) / 1000;
                if (elapsedSec > 0 && speedEl) {
                    const speedKB = (progress.loaded / 1024 / elapsedSec).toFixed(1);
                    speedEl.textContent = `${percent}% (${speedKB} KB/s)`;
                }
            }
        );

        if (statusEl) statusEl.textContent = 'Uploaded successfully!';
        setTimeout(() => {
            if (progressBar) progressBar.style.display = 'none';
            if (speedEl) speedEl.textContent = '';
            if (statusEl) statusEl.textContent = '';
        }, 3000);

        fetchStorageFiles();
    } catch (err) {
        console.error('Upload error:', err);
        if (statusEl) statusEl.textContent = 'Upload failed: ' + err.message;
    } finally {
        if (uploadBtn) uploadBtn.disabled = false;
    }
}

function setupOverwriteModal() {
    const modal = document.getElementById('overwriteModal');
    const cancelBtn = document.getElementById('modalCancelBtn');
    const updateBtn = document.getElementById('modalUpdateBtn');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
            pendingFile = null;
            pendingFileName = null;
            pendingExistingFileId = null;
        });
    }

    if (updateBtn) {
        updateBtn.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
            if (pendingFile && pendingFileName) {
                performUpload(pendingFile, pendingFileName, pendingExistingFileId);
            }
        });
    }
}

function showOverwriteModal(existingFile) {
    const modal = document.getElementById('overwriteModal');
    const img = document.getElementById('modalExistingImage');
    if (img && existingFile) {
        img.src = storage.getFileView(appwriteConfig.bucket, existingFile.$id);
    }
    if (modal) modal.style.display = 'flex';
}

function renderLoadingState(displayBox) {
    if (!displayBox) return;

    const skeletonCards = Array.from({ length: 6 }).map((_, i) => `
        <div class="storage-skeleton-card" style="animation-delay: ${i * 0.08}s">
            <div class="skeleton-img-box">
                <div class="skeleton-shimmer-sweep"></div>
                <div class="skeleton-center-badge">
                    <i class='bx bx-image-alt bx-flashing'></i>
                </div>
            </div>
            <div class="skeleton-info-bar">
                <div class="skeleton-line skeleton-title-pill"></div>
                <div class="skeleton-line skeleton-btn-pill"></div>
            </div>
        </div>
    `).join('');

    displayBox.innerHTML = `
        <div class="storage-loading-banner" id="storageLoadingBanner">
            <div class="storage-loading-spinner-wrap">
                <i class='bx bx-loader-alt bx-spin'></i>
            </div>
            <div class="storage-loading-info">
                <h4 class="storage-loading-title">Loading Bill Photos...</h4>
                <p class="storage-loading-sub">Connecting to server and retrieving saved records</p>
            </div>
        </div>
        ${skeletonCards}
    `;
}

function renderEmptyState(displayBox) {
    if (!displayBox) return;
    displayBox.innerHTML = `
        <div class="storage-empty-state">
            <div class="empty-icon-circle"><i class='bx bx-images'></i></div>
            <h3 class="empty-title">No Bill Photos Yet</h3>
            <p class="empty-desc">Uploaded bill photos will be securely stored and displayed here. Use the form above to upload your first bill photo.</p>
        </div>
    `;
}

function renderErrorState(displayBox, err) {
    if (!displayBox) return;
    displayBox.innerHTML = `
        <div class="storage-error-state">
            <div class="error-icon-circle"><i class='bx bx-wifi-off'></i></div>
            <h3 class="error-title">Could Not Load Bill Photos</h3>
            <p class="error-desc">${err?.message ? err.message : 'Please check your internet connection and try again.'}</p>
            <button class="storage-retry-btn" id="storageRetryBtn">
                <i class='bx bx-refresh'></i> Try Again
            </button>
        </div>
    `;
    const retryBtn = document.getElementById('storageRetryBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => fetchStorageFiles());
    }
}

async function fetchStorageFiles() {
    const displayBox = document.getElementById('storageDisplayBox');
    if (!displayBox) return;

    // Immediately show skeleton loaders and active loading banner
    renderLoadingState(displayBox);

    try {
        const response = await storage.listFiles(appwriteConfig.bucket, [
            Query.orderDesc('$createdAt'),
            Query.limit(100)
        ]);

        allItems = response.files || [];
        currentIndex = 0;
        displayBox.innerHTML = '';

        if (allItems.length === 0) {
            renderEmptyState(displayBox);
            return;
        }

        loadMoreItems();
    } catch (err) {
        console.error('Failed to fetch storage files:', err);
        if (displayBox) {
            renderErrorState(displayBox, err);
        }
    }
}

// --- Photo Popup Viewer (Modal) Handlers ---
function setupPhotoViewerModal() {
    const modal = document.getElementById('photoViewerModal');
    const dismissBtn = document.getElementById('photoViewerDismissBtn');
    if (!modal) return;

    if (dismissBtn) {
        dismissBtn.addEventListener('click', closePhotoViewer);
    }

    // Dismiss when clicking the dark backdrop outside the card
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closePhotoViewer();
        }
    });

    // Dismiss on Escape key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display !== 'none') {
            closePhotoViewer();
        }
    });
}

function openPhotoViewer(fileUrl, downloadUrl, fileName) {
    const modal = document.getElementById('photoViewerModal');
    const img = document.getElementById('photoViewerImg');
    const title = document.getElementById('photoViewerTitle');
    const downloadBtn = document.getElementById('photoViewerDownloadBtn');
    const spinner = document.getElementById('photoViewerSpinner');
    if (!modal || !img) return;

    const cleanTitle = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Bill Photo';
    if (title) title.textContent = cleanTitle;

    if (downloadBtn) {
        downloadBtn.href = downloadUrl;
        downloadBtn.setAttribute('download', fileName || 'bill.jpg');
    }

    if (spinner) spinner.style.display = 'flex';
    img.style.opacity = '0';

    img.onload = () => {
        if (spinner) spinner.style.display = 'none';
        img.style.opacity = '1';
    };
    img.onerror = () => {
        if (spinner) spinner.style.display = 'none';
        img.style.opacity = '1';
    };

    img.src = fileUrl;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closePhotoViewer() {
    const modal = document.getElementById('photoViewerModal');
    const img = document.getElementById('photoViewerImg');
    if (modal) {
        modal.style.display = 'none';
    }
    if (img) {
        img.src = '';
    }
    document.body.style.overflow = '';
}

function loadMoreItems() {
    if (isLoading) return;
    isLoading = true;

    const displayBox = document.getElementById('storageDisplayBox');
    const scrollLoader = document.getElementById('storageScrollLoader');
    if (!displayBox) {
        isLoading = false;
        return;
    }

    const nextBatch = allItems.slice(currentIndex, currentIndex + itemsPerLoad);
    nextBatch.forEach(file => {
        const fileUrl = storage.getFileView(appwriteConfig.bucket, file.$id);
        const downloadUrl = storage.getFileDownload(appwriteConfig.bucket, file.$id);

        const card = document.createElement('div');
        card.className = 'photoBox';
        card.innerHTML = `
            <div class="photo-img-wrap" title="Click to view full photo">
                <div class="img-loading-shimmer"></div>
                <img src="${fileUrl}" alt="${file.name}" loading="lazy" onload="this.parentElement.classList.add('img-loaded')">
                <div class="photo-view-overlay">
                    <i class='bx bx-zoom-in'></i>
                </div>
            </div>
            <div class="photo-info">
                <span class="comment">${file.name.replace(/\.[^/.]+$/, '')}</span>
                <a href="${downloadUrl}" class="downloadButton" download target="_blank">
                    <i class='bx bx-download'></i> Save
                </a>
            </div>
        `;

        // Clicking the photo opens the in-app popup modal
        const imgWrap = card.querySelector('.photo-img-wrap');
        if (imgWrap) {
            imgWrap.addEventListener('click', () => {
                openPhotoViewer(fileUrl, downloadUrl, file.name);
            });
        }

        displayBox.appendChild(card);
    });

    currentIndex += nextBatch.length;
    isLoading = false;

    if (scrollLoader) {
        scrollLoader.style.display = currentIndex >= allItems.length ? 'none' : 'block';
    }
}

function setupInfiniteScroll() {
    window.addEventListener('scroll', () => {
        const viewEl = document.getElementById('view-storage');
        if (!viewEl || !viewEl.classList.contains('active')) return;

        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 300) {
            if (currentIndex < allItems.length) {
                loadMoreItems();
            }
        }
    });
}

window.storageView = {
    init: initStorageView,
    activate: activateStorageView,
    fetchFiles: fetchStorageFiles
};
