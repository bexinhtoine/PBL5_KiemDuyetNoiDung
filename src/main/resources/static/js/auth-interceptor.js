// --- Global Fetch Interceptor for 401 ---
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/?error=banned';
        // Reject promise để code phía sau (nếu có loading) sẽ vào catch/finally và tắt loading
        return Promise.reject(new Error('Unauthorized')); 
    }
    return response;
};
// ----------------------------------------

// --- Theme Loader & Manager ---
(function() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

window.toggleTheme = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update theme toggle icons across the page if any
    updateThemeToggleIcons();
};

window.updateThemeToggleIcons = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const toggleBtns = document.querySelectorAll('#theme-toggle-btn i');
    toggleBtns.forEach(icon => {
        if (currentTheme === 'dark') {
            icon.className = 'fa-solid fa-sun';
            icon.style.color = '#f59e0b';
        } else {
            icon.className = 'fa-solid fa-moon';
            icon.style.color = '';
        }
    });
};

// Auto update icons when page loads
document.addEventListener('DOMContentLoaded', () => {
    updateThemeToggleIcons();
});

// Unified Confirmation Modal for Logout (Shared across all 3 roles)
window.showUnifiedLogoutConfirm = function(title, message, onConfirm) {
    const oldPopup = document.getElementById('unified-confirm-popup');
    if (oldPopup) oldPopup.remove();

    if (!document.getElementById('unified-confirm-styles')) {
        const style = document.createElement('style');
        style.id = 'unified-confirm-styles';
        style.textContent = `
            @keyframes unifiedPopupIn {
                from { transform: scale(0.9) translateY(10px); opacity: 0; }
                to { transform: scale(1) translateY(0); opacity: 1; }
            }
            @keyframes unifiedPopupOut {
                from { transform: scale(1) translateY(0); opacity: 1; }
                to { transform: scale(0.9) translateY(10px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    const el = document.createElement('div');
    el.id = 'unified-confirm-popup';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;justify-content:center;align-items:center;z-index:999999;padding:20px;';

    el.innerHTML = `
        <div class="unified-confirm-card" role="dialog" aria-modal="true" style="
            background: var(--surface-1, var(--surface-bg, var(--card-bg, #ffffff)));
            border: 1px solid var(--hairline, var(--border-color, #ced0d4));
            border-top: 4px solid #5e6ad2;
            border-radius: 16px;
            box-shadow: 0 24px 60px rgba(0,0,0,0.25);
            min-width: 320px; max-width: 440px; width: 100%;
            padding: 28px;
            text-align: center;
            animation: unifiedPopupIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-sizing: border-box;
        ">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(94, 106, 210, 0.1); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                <i class="fa-solid fa-arrow-right-from-bracket" style="font-size: 24px; color: #5e6ad2;"></i>
            </div>
            <h3 style="margin:0 0 10px;font-size:19px;font-weight:700;color:var(--ink, var(--text-primary, #1c1e21));line-height:1.3;">${title}</h3>
            <p style="margin:0 0 25px;font-size:14.5px;color:var(--ink-muted, var(--text-secondary, #65676b));line-height:1.5;">${message}</p>
            <div style="display:flex;gap:12px;justify-content:center;">
                <button id="unified-confirm-no" style="
                    background: var(--surface-1, var(--surface-bg, #ffffff));
                    color: var(--ink-muted, var(--text-secondary, #65676b));
                    border: 1px solid var(--hairline, var(--border-color, #ced0d4));
                    padding: 10px 22px;border-radius:8px;
                    font-size:14px;font-weight:600;cursor:pointer;
                    flex: 1; transition:all 0.2s;
                    box-sizing: border-box;
                ">Hủy bỏ</button>
                <button id="unified-confirm-yes" style="
                    background: #5e6ad2;color:#ffffff;border:none;
                    padding: 10px 22px;border-radius:8px;
                    font-size:14px;font-weight:600;cursor:pointer;
                    flex: 1; transition:all 0.2s;
                    box-sizing: border-box;
                ">Xác nhận</button>
            </div>
        </div>
    `;

    const closeDialog = () => {
        const card = el.querySelector('.unified-confirm-card');
        if (card) card.style.animation = 'unifiedPopupOut 0.18s ease forwards';
        setTimeout(() => el.remove(), 180);
    };

    document.body.appendChild(el);

    const yesBtn = el.querySelector('#unified-confirm-yes');
    const noBtn = el.querySelector('#unified-confirm-no');
    
    yesBtn.onmouseenter = () => { yesBtn.style.opacity = '0.9'; };
    yesBtn.onmouseleave = () => { yesBtn.style.opacity = '1'; };
    
    noBtn.onmouseenter = () => { noBtn.style.background = 'var(--surface-2, var(--bg-main, #f0f2f5))'; };
    noBtn.onmouseleave = () => { noBtn.style.background = 'var(--surface-1, var(--surface-bg, #ffffff))'; };

    yesBtn.onclick = () => { closeDialog(); if (onConfirm) onConfirm(); };
    noBtn.onclick = closeDialog;
    el.onclick = e => { if (e.target === el) closeDialog(); };
    
    const escHandler = e => {
        if (e.key === 'Escape') {
            closeDialog();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
};
