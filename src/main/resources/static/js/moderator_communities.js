// moderator_communities.js

let cachedCommunities = [];

async function loadCommunities() {
    const listBody = document.getElementById('communities-list');
    if (!listBody) return;

    try {
        listBody.innerHTML = '<tr><td colspan="5" class="table-loading"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách cộng đồng...</td></tr>';
        
        const res = await fetch('/api/moderator/communities', {
            headers: {
                'Authorization': `Bearer ${window.token || localStorage.getItem('token')}`
            }
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const communities = await res.json();
        cachedCommunities = communities;
        renderCommunitiesTable(communities);
    } catch (error) {
        console.error("Lỗi tải danh sách cộng đồng:", error);
        listBody.innerHTML = '<tr><td colspan="5" class="table-loading" style="color: red;">Lỗi khi tải dữ liệu cộng đồng. Vui lòng thử lại.</td></tr>';
    }
}

function renderCommunitiesTable(communities) {
    const listBody = document.getElementById('communities-list');
    if (!listBody) return;

    if (!communities || communities.length === 0) {
        listBody.innerHTML = '<tr><td colspan="5" class="table-loading">Không có cộng đồng nào trên hệ thống.</td></tr>';
        return;
    }

    listBody.innerHTML = communities.map(community => {
        const privacyBadge = community.privacyStatus === 'PUBLIC' 
            ? '<span class="status-badge" style="background: rgba(0, 209, 178, 0.1); color: #00d1b2;"><i class="fa-solid fa-globe"></i> Công khai</span>'
            : '<span class="status-badge" style="background: rgba(255, 186, 8, 0.1); color: #ffba08;"><i class="fa-solid fa-lock"></i> Riêng tư</span>';

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 8px; background: var(--bg-main); display: flex; align-items: center; justify-content: center; color: var(--mod-primary); border: 1px solid var(--border-color);">
                            <i class="fa-solid fa-users"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; font-size: 14px; color: var(--text-primary); margin-bottom: 3px;">
                                ${escapeHtml(community.name)}
                            </div>
                            <div style="font-size: 12px; color: var(--text-secondary);">
                                ID: ${community.id} • ${community.memberCount || 0} thành viên
                            </div>
                        </div>
                    </div>
                </td>
                <td>${privacyBadge}</td>
                <td>
                    <div style="font-size: 13px; color: var(--text-primary);">${new Date(community.createdAt).toLocaleDateString('vi-VN')}</div>
                </td>
                <td>
                    <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">
                        ${escapeHtml(community.creatorName || 'Ẩn danh')}
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary);">
                        ID: ${community.creatorId}
                    </div>
                </td>
                <td>
                    <button class="btn-action danger" onclick="deleteCommunity(${community.id}, '${escapeHtml(community.name.replace(/'/g, "\\'"))}')" title="Xóa cộng đồng">
                        <i class="fa-solid fa-trash"></i> Xóa
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function deleteCommunity(communityId, communityName) {
    if (typeof showCustomConfirm !== 'function') {
        window.showToast("Lỗi hệ thống: Tính năng xác nhận chưa được tải!", "error");
        return;
    }

    showCustomConfirm(
        'Xóa cộng đồng', 
        `Bạn có chắc chắn muốn XÓA vĩnh viễn cộng đồng "<b>${communityName}</b>"? <br><br>Hành động này sẽ gỡ bỏ tất cả bài viết liên quan và giải tán thành viên. Không thể hoàn tác!`, 
        async () => {
            try {
                const res = await fetch(`/api/moderator/communities/${communityId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${window.token || localStorage.getItem('token')}` }
                });

                if (res.ok) {
                    showCustomAlert('Thành công', `Đã xóa cộng đồng ${communityName} thành công.`, 'success');
                    if (window.appendActionLog) {
                        appendActionLog('Xóa cộng đồng', `Group-${communityId}`);
                    }
                    await loadCommunities();
                } else {
                    const msg = await res.text();
                    showCustomAlert('Lỗi', msg || 'Lỗi khi xóa cộng đồng.', 'error');
                }
            } catch (e) {
                console.error(e);
                showCustomAlert('Lỗi kết nối', 'Không thể kết nối đến máy chủ.', 'error');
            }
        },
        '#ff4d4f'
    );
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('communities-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            const filtered = cachedCommunities.filter(c => 
                (c.name && c.name.toLowerCase().includes(keyword)) || 
                (c.description && c.description.toLowerCase().includes(keyword)) ||
                (String(c.id) === keyword)
            );
            renderCommunitiesTable(filtered);
        });
    }
});
