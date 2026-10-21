const API_BASE = 'https://walkn-seek-api.onrender.com/api/walkins';
let pendingDeleteId = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchWalkins();

    document.getElementById('searchInput').addEventListener('input', fetchWalkins);
    document.getElementById('filterLocation').addEventListener('change', fetchWalkins);
    document.getElementById('filterRole').addEventListener('change', fetchWalkins);
    document.getElementById('filterEligibility').addEventListener('change', fetchWalkins);

    const postModal = document.getElementById('postModal');
    document.getElementById('openModalBtn').addEventListener('click', () => {
        resetForm();
        document.querySelector('#postModal .modal-header h3').innerHTML = '<i class="fa-solid fa-bullhorn"></i> Post a Walk-In Opening';
        postModal.style.display = 'flex';
    });
    document.getElementById('closeModalBtn').addEventListener('click', () => postModal.style.display = 'none');

    // Alert Modal close listeners
    document.getElementById('closeAlertBtn').addEventListener('click', closeAlertModal);
    document.getElementById('alertCancelBtn').addEventListener('click', closeAlertModal);

    // Form Submission
    document.getElementById('walkinForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const editId = document.getElementById('editId').value;
        const payload = {
            company: document.getElementById('company').value,
            role: document.getElementById('role').value,
            location: document.getElementById('location').value,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            eligibility: document.getElementById('eligibility').value,
            skills: document.getElementById('skills').value,
            venue: document.getElementById('venue').value,
            contact_info: document.getElementById('contactInfo').value || 'N/A'
        };

        const url = editId ? `${API_BASE}/${editId}` : API_BASE;
        const method = editId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                postModal.style.display = 'none';
                resetForm();
                fetchWalkins();
                showAlertModal(
                    'Success',
                    editId ? 'Walk-in updated successfully!' : 'Walk-in drive published successfully!',
                    false
                );
            }
        } catch (err) {
            showAlertModal('Error', 'Error connecting to server.', false);
        }
    });
});

function resetForm() {
    document.getElementById('walkinForm').reset();
    document.getElementById('editId').value = '';
}

/* Custom Modal Alert & Confirmation System */
function showAlertModal(title, message, isConfirm = false, onConfirm = null) {
    const alertModal = document.getElementById('customAlertModal');
    const titleEl = document.getElementById('alertModalTitle');
    const msgEl = document.getElementById('alertModalMessage');
    const cancelBtn = document.getElementById('alertCancelBtn');
    const confirmBtn = document.getElementById('alertConfirmBtn');

    titleEl.innerHTML = `<i class="fa-solid ${isConfirm ? 'fa-triangle-exclamation' : 'fa-circle-info'}"></i> ${title}`;
    msgEl.textContent = message;

    if (isConfirm) {
        cancelBtn.style.display = 'inline-block';
        confirmBtn.className = 'btn-danger';
        confirmBtn.textContent = 'Yes, Delete';
        confirmBtn.onclick = async () => {
            closeAlertModal();
            if (onConfirm) await onConfirm();
        };
    } else {
        cancelBtn.style.display = 'none';
        confirmBtn.className = 'btn-primary';
        confirmBtn.textContent = 'OK';
        confirmBtn.onclick = closeAlertModal;
    }

    alertModal.style.display = 'flex';
}

function closeAlertModal() {
    document.getElementById('customAlertModal').style.display = 'none';
}

async function fetchWalkins() {
    const search = document.getElementById('searchInput').value;
    const location = document.getElementById('filterLocation').value;
    const role = document.getElementById('filterRole').value;
    const eligibility = document.getElementById('filterEligibility').value;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (location !== 'All') params.append('location', location);
    if (role !== 'All') params.append('role', role);
    if (eligibility !== 'All') params.append('eligibility', eligibility);

    try {
        const res = await fetch(`${API_BASE}?${params.toString()}`);
        const data = await res.json();
        renderCards(data);
    } catch (err) {
        console.error("Failed to fetch walk-ins:", err);
    }
}

function renderCards(walkins) {
    const grid = document.getElementById('walkinsGrid');
    document.getElementById('totalCount').textContent = walkins.length;
    grid.innerHTML = '';

    if (walkins.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No active walk-ins found matching your search criteria.</p>`;
        return;
    }

    walkins.forEach(item => {
        const skillsTags = item.skills.split(',').map(s => `<span class="tag">${s.trim()}</span>`).join('');
        
        const card = document.createElement('div');
        card.className = 'walkin-card';
        card.innerHTML = `
            <div>
                <div class="card-header">
                    <span class="company-title">${item.company}</span>
                    <span class="badge-date"><i class="fa-regular fa-calendar"></i> ${item.date}</span>
                </div>
                <div class="card-role">${item.role}</div>
                <div class="card-details">
                    <p><i class="fa-solid fa-location-dot"></i> ${item.location}</p>
                    <p><i class="fa-regular fa-clock"></i> ${item.time}</p>
                    <p><i class="fa-solid fa-graduation-cap"></i> ${item.eligibility}</p>
                    <p><i class="fa-solid fa-map-pin"></i> ${item.venue}</p>
                </div>
                <div class="tag-container">${skillsTags}</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 0.8rem;">
                ${item.contact_info !== 'N/A' ? `<a href="${item.contact_info}" target="_blank" style="color: var(--primary); text-decoration: none; font-size: 0.85rem; font-weight: 600;"><i class="fa-solid fa-link"></i> Contact / Link</a>` : '<span></span>'}
                <div>
                    <button onclick="editWalkin(${JSON.stringify(item).replace(/"/g, '&quot;')})" style="background: transparent; border: none; color: var(--primary); cursor: pointer; margin-right: 0.8rem; font-size: 0.9rem;" title="Edit Drive"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                    <button onclick="confirmDelete(${item.id})" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 0.9rem;" title="Delete Drive"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function editWalkin(item) {
    document.getElementById('editId').value = item.id;
    document.getElementById('company').value = item.company;
    document.getElementById('role').value = item.role;
    document.getElementById('location').value = item.location;
    document.getElementById('date').value = item.date;
    document.getElementById('time').value = item.time;
    document.getElementById('eligibility').value = item.eligibility;
    document.getElementById('skills').value = item.skills;
    document.getElementById('venue').value = item.venue;
    document.getElementById('contactInfo').value = item.contact_info === 'N/A' ? '' : item.contact_info;

    document.querySelector('#postModal .modal-header h3').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Walk-In Opening';
    document.getElementById('postModal').style.display = 'flex';
}

function confirmDelete(id) {
    showAlertModal(
        'Confirm Deletion',
        'Are you sure you want to delete or cancel this walk-in drive?',
        true,
        async () => {
            try {
                const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    fetchWalkins();
                    showAlertModal('Deleted', 'Walk-in drive deleted successfully.', false);
                }
            } catch (err) {
                showAlertModal('Error', 'Error deleting drive.', false);
            }
        }
    );
}