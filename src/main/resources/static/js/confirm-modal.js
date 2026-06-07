/**
 * Custom confirm modal to replace native browser confirm()
 */
window.showConfirmModal = function(title, message, onConfirm, onCancel = null) {
    let existing = document.getElementById('custom-confirm-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-confirm-modal';
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.65);
        z-index: 999999;
        opacity: 0;
        transition: opacity 0.2s ease;
        font-family: inherit;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="
            width: 90%;
            max-width: 420px;
            padding: 24px;
            border-radius: 12px;
            background: var(--card-bg, #ffffff);
            color: var(--text-main, #1c1e21);
            box-shadow: 0 12px 28px 0 rgba(0, 0, 0, 0.2), 0 2px 4px 0 rgba(0, 0, 0, 0.1);
            transform: scale(0.9);
            transition: transform 0.2s ease;
            box-sizing: border-box;
        ">
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--border-color, #e4e6eb);
                padding-bottom: 12px;
                margin-bottom: 16px;
            ">
                <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text-main, #050505);">${title}</h3>
                <button id="confirm-modal-close-btn" style="
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: var(--text-muted, #65676b);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                "><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div style="
                font-size: 15px;
                line-height: 1.5;
                color: var(--text-main, #050505);
                margin-bottom: 24px;
            ">
                ${message}
            </div>
            <div style="
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            ">
                <button id="confirm-modal-cancel-btn" style="
                    border-radius: 6px;
                    padding: 9px 16px;
                    background: var(--bg-hover, #e4e6eb);
                    color: var(--text-main, #050505);
                    border: none;
                    font-weight: 600;
                    font-size: 15px;
                    cursor: pointer;
                    transition: filter 0.1s ease;
                ">Hủy</button>
                <button id="confirm-modal-ok-btn" style="
                    border-radius: 6px;
                    padding: 9px 16px;
                    background: var(--primary-color, #1877f2);
                    color: white;
                    border: none;
                    font-weight: 600;
                    font-size: 15px;
                    cursor: pointer;
                    transition: filter 0.1s ease;
                ">Xác nhận</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Fade in
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.querySelector('.modal-content').style.transform = 'scale(1)';
    }, 10);

    const closeModal = () => {
        modal.style.opacity = '0';
        modal.querySelector('.modal-content').style.transform = 'scale(0.9)';
        setTimeout(() => modal.remove(), 200);
    };

    modal.querySelector('#confirm-modal-close-btn').onclick = () => {
        closeModal();
        if (onCancel) onCancel();
    };

    modal.querySelector('#confirm-modal-cancel-btn').onclick = () => {
        closeModal();
        if (onCancel) onCancel();
    };

    modal.querySelector('#confirm-modal-ok-btn').onclick = () => {
        closeModal();
        if (onConfirm) onConfirm();
    };

    // Close when clicking overlay
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
            if (onCancel) onCancel();
        }
    };
};
