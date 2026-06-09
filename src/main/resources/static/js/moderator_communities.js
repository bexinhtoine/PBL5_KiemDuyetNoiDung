// moderator_communities.js

let cachedCommunities = [];

async function loadCommunities() {
    const listBody = document.getElementById('communities-list');
    if (!listBody) return;

    try {
        listBody.innerHTML = `<tr><td colspan="6" style="padding:0;border:none;"><div style="display:flex;align-items:center;gap:10px;padding:12px 16px;"><div class="skeleton-box" style="width:32px;height:32px;border-radius:8px;flex-shrink:0;"></div><div style="flex:1;display:flex;flex-direction:column;gap:4px;"><div class="skeleton-box" style="width:35%;height:10px;"></div><div class="skeleton-box" style="width:55%;height:8px;"></div></div></div></td></tr><tr><td colspan="6" style="padding:0;border:none;"><div style="display:flex;align-items:center;gap:10px;padding:12px 16px;"><div class="skeleton-box" style="width:32px;height:32px;border-radius:8px;flex-shrink:0;"></div><div style="flex:1;display:flex;flex-direction:column;gap:4px;"><div class="skeleton-box" style="width:45%;height:10px;"></div><div class="skeleton-box" style="width:40%;height:8px;"></div></div></div></td></tr><tr><td colspan="6" style="padding:0;border:none;"><div style="display:flex;align-items:center;gap:10px;padding:12px 16px;"><div class="skeleton-box" style="width:32px;height:32px;border-radius:8px;flex-shrink:0;"></div><div style="flex:1;display:flex;flex-direction:column;gap:4px;"><div class="skeleton-box" style="width:30%;height:10px;"></div><div class="skeleton-box" style="width:65%;height:8px;"></div></div></div></td></tr>`;
        
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
        applyCommunitiesFilter();
    } catch (error) {
        console.error("Lỗi tải danh sách cộng đồng:", error);
        document.getElementById('communities-list').innerHTML = '<tr><td colspan="6" class="table-loading" style="color: red;">Lỗi khi tải dữ liệu cộng đồng. Vui lòng thử lại.</td></tr>';
    }
}

function applyCommunitiesFilter() {
    const keyword = (document.getElementById('communities-search-input')?.value || '').toLowerCase();
    const statusVal = document.getElementById('communities-status-filter')?.value || 'ALL';

    const filtered = cachedCommunities.filter(c => {
        const matchesSearch = !keyword ||
            (c.name && c.name.toLowerCase().includes(keyword)) ||
            (c.description && c.description.toLowerCase().includes(keyword)) ||
            (String(c.id) === keyword);

        const isLocked = c.locked === true || c.status === 'LOCKED';
        const matchesStatus = statusVal === 'ALL' ||
            (statusVal === 'LOCKED' && isLocked) ||
            (statusVal === 'ACTIVE' && !isLocked);

        return matchesSearch && matchesStatus;
    });

    renderCommunitiesTable(filtered);
}

function renderCommunitiesTable(communities) {
    const listBody = document.getElementById('communities-list');
    if (!listBody) return;

    if (!communities || communities.length === 0) {
        listBody.innerHTML = '<tr><td colspan="6" class="table-loading">Không có cộng đồng nào phù hợp.</td></tr>';
        return;
    }

    listBody.innerHTML = communities.map(community => {
        const privacyBadge = community.privacyStatus === 'PUBLIC' 
            ? '<span class="status-badge" style="background: rgba(0, 209, 178, 0.1); color: #00d1b2;"><i class="fa-solid fa-globe"></i> Công khai</span>'
            : '<span class="status-badge" style="background: rgba(255, 186, 8, 0.1); color: #ffba08;"><i class="fa-solid fa-lock"></i> Riêng tư</span>';

        const isLocked = community.locked === true || community.status === 'LOCKED';
        const statusBadge = isLocked
            ? '<span class="status-badge danger"><i class="fa-solid fa-lock"></i> Đã khóa</span>'
            : '<span class="status-badge success"><i class="fa-solid fa-circle-check"></i> Hoạt động</span>';

        const communityNameSafe = escapeHtml(community.name || '').replace(/'/g, "\\'");

        return `
            <tr style="${isLocked ? 'opacity: 0.75; background: rgba(239,68,68,0.03);' : ''}">
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
                <td>${statusBadge}</td>
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
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <button class="btn-action detail" onclick="viewCommunityDetail(${community.id})" title="Xem chi tiết" style="padding: 6px 10px; font-size: 12px;">
                            <i class="fa-solid fa-eye"></i> Chi tiết
                        </button>
                        ${isLocked
                            ? `<button class="btn-action success" onclick="unlockCommunity(${community.id}, '${communityNameSafe}')" title="Mở khóa" style="padding: 6px 10px; font-size: 12px;">
                                <i class="fa-solid fa-lock-open"></i> Mở khóa
                               </button>`
                            : `<button class="btn-action warning" onclick="openLockCommunityModal(${community.id}, '${communityNameSafe}')" title="Khóa tạm thời" style="padding: 6px 10px; font-size: 12px;">
                                <i class="fa-solid fa-lock"></i> Khóa
                               </button>`
                        }
                        <button class="btn-action danger" onclick="deleteCommunity(${community.id}, '${communityNameSafe}')" title="Xóa cộng đồng" style="padding: 6px 10px; font-size: 12px;">
                            <i class="fa-solid fa-trash"></i> Xóa
                        </button>
                    </div>
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

// ============================================================
// VIEW DETAIL
// ============================================================
// Global chart reference to avoid reuse errors
let modCommunityChartInstance = null;

window.viewCommunityDetail = async function(communityId) {
    const modal = document.getElementById('view-community-modal');
    const body = document.getElementById('view-community-body');
    if (!modal || !body) return;

    modal.style.display = 'flex';
    body.innerHTML = '<div style="padding:20px;"><div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;"><div class="skeleton-box" style="width:48px;height:48px;border-radius:12px;"></div><div style="flex:1;display:flex;flex-direction:column;gap:6px;"><div class="skeleton-box" style="width:40%;height:14px;"></div><div class="skeleton-box" style="width:25%;height:10px;"></div></div></div><div class="skeleton-box" style="width:100%;height:1px;margin-bottom:16px;"></div><div style="display:flex;flex-direction:column;gap:8px;"><div class="skeleton-box" style="width:90%;height:12px;"></div><div class="skeleton-box" style="width:70%;height:12px;"></div><div class="skeleton-box" style="width:80%;height:12px;"></div></div></div>';

    try {
        const community = cachedCommunities.find(c => c.id === communityId);
        if (!community) {
            body.innerHTML = '<div style="color: red; padding: 20px;">Không tìm thấy thông tin cộng đồng.</div>';
            return;
        }

        const isLocked = community.locked === true || community.status === 'LOCKED';
        const statusBadge = isLocked
            ? '<span class="status-badge danger"><i class="fa-solid fa-lock"></i> Đã khóa</span>'
            : '<span class="status-badge success"><i class="fa-solid fa-circle-check"></i> Hoạt động</span>';

        body.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <!-- Header -->
                <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--surface-bg); border-radius: 12px; border: 1px solid var(--border-color);">
                    <div style="width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, var(--mod-primary), #0284c7); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24px; flex-shrink: 0;">
                        <i class="fa-solid fa-users"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px;">${escapeHtml(community.name)}</div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                            ${statusBadge}
                            <span class="status-badge" style="background: rgba(0,70,160,0.08); color: var(--mod-primary);">ID: ${community.id}</span>
                            <span class="status-badge" style="background: rgba(0,209,178,0.1); color: #00d1b2;"><i class="fa-solid fa-users"></i> ${community.memberCount || 0} thành viên</span>
                            ${community.privacyStatus === 'PUBLIC'
                                ? '<span class="status-badge success"><i class="fa-solid fa-globe"></i> Công khai</span>'
                                : '<span class="status-badge warning"><i class="fa-solid fa-lock"></i> Riêng tư</span>'
                            }
                        </div>
                    </div>
                </div>

                <!-- Tab Navigation -->
                <div class="comm-tabs-nav">
                    <button class="comm-tab-btn active" data-tab="info" onclick="modSwitchCommunityTab('info', ${community.id})">Thông tin chung</button>
                    <button class="comm-tab-btn" data-tab="posts" onclick="modSwitchCommunityTab('posts', ${community.id})">Bài viết</button>
                    <button class="comm-tab-btn" data-tab="members" onclick="modSwitchCommunityTab('members', ${community.id})">Thành viên</button>
                    <button class="comm-tab-btn" data-tab="rules" onclick="modSwitchCommunityTab('rules', ${community.id})">Quy tắc</button>
                    <button class="comm-tab-btn" data-tab="topics" onclick="modSwitchCommunityTab('topics', ${community.id})">Chủ đề</button>
                    <button class="comm-tab-btn" data-tab="stats" onclick="modSwitchCommunityTab('stats', ${community.id})">Thống kê</button>
                </div>

                <!-- Tab Panels -->
                <!-- 1. Info Panel -->
                <div class="comm-tab-panel active" data-tab="info">
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <!-- Stats -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                            <div style="background: var(--surface-bg); border-radius: 10px; border: 1px solid var(--border-color); padding: 14px; text-align: center;">
                                <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Ngày tạo</div>
                                <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${community.createdAt ? new Date(community.createdAt).toLocaleDateString('vi-VN') : '--'}</div>
                            </div>
                            <div style="background: var(--surface-bg); border-radius: 10px; border: 1px solid var(--border-color); padding: 14px; text-align: center;">
                                <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Tổng bài viết</div>
                                <div style="font-size: 20px; font-weight: 800; color: var(--mod-primary);">${community.postCount || 0}</div>
                            </div>
                            <div style="background: var(--surface-bg); border-radius: 10px; border: 1px solid var(--border-color); padding: 14px; text-align: center;">
                                <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Chế độ</div>
                                <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${community.privacyStatus === 'PUBLIC' ? '🌐 Công khai' : '🔒 Riêng tư'}</div>
                            </div>
                        </div>
                        <!-- Creator -->
                        <div style="background: var(--surface-bg); border-radius: 10px; border: 1px solid var(--border-color); padding: 14px;">
                            <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">Người tạo</div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700;">${(community.creatorName || '?').charAt(0).toUpperCase()}</div>
                                <div>
                                    <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(community.creatorName || 'Ẩn danh')}</div>
                                    <div style="font-size: 12px; color: var(--text-secondary);">#UID-${community.creatorId}</div>
                                </div>
                            </div>
                        </div>
                        ${community.description ? `
                        <div style="background: var(--surface-bg); border-radius: 10px; border: 1px solid var(--border-color); padding: 14px;">
                            <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Mô tả</div>
                            <div style="font-size: 14px; color: var(--text-primary); line-height: 1.6;">${escapeHtml(community.description)}</div>
                        </div>` : ''}
                        ${isLocked && community.lockReason ? `
                        <div style="background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.25); border-radius: 10px; padding: 14px;">
                            <div style="font-size: 11px; font-weight: 700; color: #ef4444; text-transform: uppercase; margin-bottom: 8px;"><i class="fa-solid fa-triangle-exclamation"></i> Lý do khóa</div>
                            <div style="font-size: 14px; color: var(--text-primary);">${escapeHtml(community.lockReason)}</div>
                        </div>` : ''}
                    </div>
                </div>

                <!-- 2. Posts Panel -->
                <div class="comm-tab-panel" data-tab="posts">
                    <div id="mod-comm-posts-content" style="max-height: 400px; overflow-y: auto; padding-right: 4px;">
                        <div class="skeleton-post-list">
                            <div class="skeleton-post-card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><div class="skeleton-box skeleton-avatar"></div><div style="display:flex;flex-direction:column;gap:4px;"><div class="skeleton-box skeleton-title"></div><div class="skeleton-box skeleton-meta-line"></div></div></div><div class="skeleton-box skeleton-content-line"></div><div class="skeleton-box skeleton-content-line medium"></div></div>
                            <div class="skeleton-post-card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><div class="skeleton-box skeleton-avatar"></div><div style="display:flex;flex-direction:column;gap:4px;"><div class="skeleton-box skeleton-title"></div><div class="skeleton-box skeleton-meta-line"></div></div></div><div class="skeleton-box skeleton-content-line"></div><div class="skeleton-box skeleton-content-line short"></div></div>
                        </div>
                    </div>
                </div>

                <!-- 3. Members Panel -->
                <div class="comm-tab-panel" data-tab="members">
                    <div id="mod-comm-members-content" style="max-height: 400px; overflow-y: auto; padding-right: 4px;">
                        <div style="display:flex;flex-direction:column;">
                            <div class="skeleton-member-row"><div class="skeleton-box skeleton-avatar"></div><div style="display:flex;flex-direction:column;gap:4px;flex:1;"><div class="skeleton-box skeleton-title" style="width:140px;"></div><div class="skeleton-box skeleton-meta-line" style="width:200px;"></div></div><div class="skeleton-box" style="width:60px;height:18px;border-radius:10px;"></div></div>
                            <div class="skeleton-member-row"><div class="skeleton-box skeleton-avatar"></div><div style="display:flex;flex-direction:column;gap:4px;flex:1;"><div class="skeleton-box skeleton-title" style="width:100px;"></div><div class="skeleton-box skeleton-meta-line" style="width:180px;"></div></div><div class="skeleton-box" style="width:60px;height:18px;border-radius:10px;"></div></div>
                        </div>
                    </div>
                </div>

                <!-- 4. Rules Panel -->
                <div class="comm-tab-panel" data-tab="rules">
                    <div id="mod-comm-rules-content" style="max-height: 400px; overflow-y: auto; padding-right: 4px;">
                        <div style="display:flex;flex-direction:column;gap:12px;">
                            <div class="skeleton-rule-card"><div class="skeleton-box skeleton-rule-title"></div><div class="skeleton-box skeleton-rule-desc"></div></div>
                            <div class="skeleton-rule-card"><div class="skeleton-box skeleton-rule-title" style="width:150px;"></div><div class="skeleton-box skeleton-rule-desc"></div></div>
                        </div>
                    </div>
                </div>

                <!-- 5. Topics Panel -->
                <div class="comm-tab-panel" data-tab="topics">
                    <div id="mod-comm-topics-content" style="max-height: 400px; overflow-y: auto; padding-right: 4px;">
                        <div style="padding:15px; background: var(--surface-bg); border-radius: 10px; border: 1px solid var(--border-color); display: flex; flex-wrap: wrap; gap: 8px;"><div class="skeleton-box" style="width:80px;height:24px;border-radius:12px;"></div><div class="skeleton-box" style="width:100px;height:24px;border-radius:12px;"></div><div class="skeleton-box" style="width:70px;height:24px;border-radius:12px;"></div></div>
                    </div>
                </div>

                <!-- 6. Statistics Panel -->
                <div class="comm-tab-panel" data-tab="stats">
                    <div id="mod-comm-stats-content">
                        <div class="skeleton-stats-grid" style="margin-bottom:20px;"><div class="skeleton-stats-card"><div class="skeleton-box skeleton-stats-title"></div><div class="skeleton-box skeleton-stats-val"></div></div><div class="skeleton-stats-card"><div class="skeleton-box skeleton-stats-title" style="width:80px;"></div><div class="skeleton-box skeleton-stats-val"></div></div><div class="skeleton-stats-card"><div class="skeleton-box skeleton-stats-title" style="width:90px;"></div><div class="skeleton-box skeleton-stats-val"></div></div></div><div style="background: var(--surface-bg); border-radius: 12px; border: 1px solid var(--border-color); padding: 16px; height: 320px; display: flex; flex-direction: column; gap: 12px;"><div class="skeleton-box" style="width:200px;height:14px;"></div><div class="skeleton-box" style="width:100%;flex:1;"></div></div>
                    </div>
                </div>

                <!-- Action buttons -->
                <div style="display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 8px;">
                    ${isLocked
                        ? `<button onclick="unlockCommunity(${community.id}, '${escapeHtml(community.name).replace(/'/g, "\\'")}'); closeViewCommunityModal();" style="padding: 10px 20px; border-radius: 8px; border: none; background: #22c55e; color: #fff; cursor: pointer; font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px;"><i class="fa-solid fa-lock-open"></i> Mở khóa</button>`
                        : `<button onclick="closeViewCommunityModal(); openLockCommunityModal(${community.id}, '${escapeHtml(community.name).replace(/'/g, "\\'")}');" style="padding: 10px 20px; border-radius: 8px; border: none; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; cursor: pointer; font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px;"><i class="fa-solid fa-lock"></i> Khóa tạm thời</button>`
                    }
                    <button onclick="closeViewCommunityModal(); deleteCommunity(${community.id}, '${escapeHtml(community.name).replace(/'/g, "\\'")}');" style="padding: 10px 20px; border-radius: 8px; border: none; background: #ef4444; color: #fff; cursor: pointer; font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px;"><i class="fa-solid fa-trash"></i> Xóa cộng đồng</button>
                    <button onclick="closeViewCommunityModal()" style="padding: 10px 20px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--surface-bg); color: var(--text-primary); cursor: pointer; font-size: 14px; font-weight: 600;">Đóng</button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error(error);
        body.innerHTML = '<div style="color: red; padding: 20px;">Lỗi khi tải chi tiết cộng đồng.</div>';
    }
};

window.modSwitchCommunityTab = function(tabName, id) {
    const modal = document.getElementById('view-community-modal');
    if (!modal) return;
    
    modal.querySelectorAll('.comm-tab-btn').forEach(btn => btn.classList.remove('active'));
    modal.querySelectorAll('.comm-tab-panel').forEach(panel => panel.classList.remove('active'));
    
    const targetBtn = modal.querySelector(`.comm-tab-btn[data-tab="${tabName}"]`);
    const targetPanel = modal.querySelector(`.comm-tab-panel[data-tab="${tabName}"]`);
    
    if (targetBtn) targetBtn.classList.add('active');
    if (targetPanel) targetPanel.classList.add('active');
    
    if (tabName === 'posts') {
        window.modLoadCommunityPostsTab(id);
    } else if (tabName === 'members') {
        window.modLoadCommunityMembersTab(id);
    } else if (tabName === 'rules') {
        window.modLoadCommunityRulesTab(id);
    } else if (tabName === 'topics') {
        window.modLoadCommunityTopicsTab(id);
    } else if (tabName === 'stats') {
        window.modLoadCommunityStatsTab(id);
    }
};

window.modLoadCommunityPostsTab = async function(id) {
    const container = document.getElementById('mod-comm-posts-content');
    if (!container) return;
    container.innerHTML = `
        <div class="skeleton-post-list">
            <div class="skeleton-post-card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><div class="skeleton-box skeleton-avatar"></div><div style="display:flex;flex-direction:column;gap:4px;"><div class="skeleton-box skeleton-title"></div><div class="skeleton-box skeleton-meta-line"></div></div></div><div class="skeleton-box skeleton-content-line"></div><div class="skeleton-box skeleton-content-line medium"></div></div>
            <div class="skeleton-post-card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;"><div class="skeleton-box skeleton-avatar"></div><div style="display:flex;flex-direction:column;gap:4px;"><div class="skeleton-box skeleton-title"></div><div class="skeleton-box skeleton-meta-line"></div></div></div><div class="skeleton-box skeleton-content-line"></div><div class="skeleton-box skeleton-content-line short"></div></div>
        </div>
    `;
    
    try {
        const token = window.token || localStorage.getItem('token');
        const res = await fetch(`/api/communities/${id}/posts`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error();
        const posts = await res.json();
        
        if (!posts || posts.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 30px;">Không có bài viết nào.</p>';
            return;
        }
        
        container.innerHTML = posts.map(p => {
            const authorInit = (p.authorName || '?').charAt(0).toUpperCase();
            const avatarHtml = p.authorAvatar 
                ? `<img src="${p.authorAvatar}" style="width: 100%; height: 100%; object-fit: cover;">` 
                : authorInit;
            const hasMedia = p.imageUrl || p.videoUrl;
            
            return `
                <div class="comm-post-item" onclick="closeViewCommunityModal(); window.viewPostDetail(${p.id})">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <div class="user-avatar-sm" style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--mod-primary), #0284c7); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12px; overflow: hidden; flex-shrink: 0;">${avatarHtml}</div>
                        <div>
                            <div style="font-weight: 700; font-size: 13px; color: var(--text-primary);">${escapeHtml(p.authorName)}</div>
                            <div style="font-size: 11px; color: var(--text-secondary);">${new Date(p.createdAt).toLocaleString('vi-VN')}</div>
                        </div>
                        <span class="status-badge ${p.status === 'ACTIVE' ? 'success' : 'warning'}" style="margin-left: auto; font-size: 10px;">
                            ${p.status}
                        </span>
                    </div>
                    <div style="font-size: 13px; color: var(--text-primary); margin-bottom: 6px; line-height: 1.4; word-break: break-word;">
                        ${escapeHtml(p.content || '(Không có nội dung)')}
                    </div>
                    ${hasMedia ? `<div style="font-size: 12px; color: #0284c7; font-weight: 600;"><i class="fa-solid fa-paperclip"></i> Có đính kèm phương tiện</div>` : ''}
                    <div style="display: flex; gap: 15px; margin-top: 8px; font-size: 12px; color: var(--text-secondary); border-top: 1px solid var(--border-color); padding-top: 6px;">
                        <span><i class="fa-solid fa-heart"></i> ${p.likeCount || 0}</span>
                        <span><i class="fa-solid fa-comment"></i> ${p.commentCount || 0}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = '<p style="text-align: center; color: red; padding: 30px;">Lỗi khi tải danh sách bài viết.</p>';
    }
};

window.modLoadCommunityMembersTab = async function(id) {
    const container = document.getElementById('mod-comm-members-content');
    if (!container) return;
    container.innerHTML = `
        <div style="display:flex;flex-direction:column;">
            <div class="skeleton-member-row"><div class="skeleton-box skeleton-avatar"></div><div style="display:flex;flex-direction:column;gap:4px;flex:1;"><div class="skeleton-box skeleton-title" style="width:140px;"></div><div class="skeleton-box skeleton-meta-line" style="width:200px;"></div></div><div class="skeleton-box" style="width:60px;height:18px;border-radius:10px;"></div></div>
            <div class="skeleton-member-row"><div class="skeleton-box skeleton-avatar"></div><div style="display:flex;flex-direction:column;gap:4px;flex:1;"><div class="skeleton-box skeleton-title" style="width:100px;"></div><div class="skeleton-box skeleton-meta-line" style="width:180px;"></div></div><div class="skeleton-box" style="width:60px;height:18px;border-radius:10px;"></div></div>
        </div>
    `;
    
    try {
        const token = window.token || localStorage.getItem('token');
        const res = await fetch(`/api/communities/${id}/members?status=ACTIVE`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error();
        const members = await res.json();
        
        if (!members || members.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 30px;">Không có thành viên nào.</p>';
            return;
        }
        
        container.innerHTML = members.map(m => {
            const authorInit = (m.fullName || '?').charAt(0).toUpperCase();
            const avatarHtml = m.avatar 
                ? `<img src="${m.avatar}" style="width: 100%; height: 100%; object-fit: cover;">` 
                : authorInit;
                
            let roleBadge = '<span class="status-badge" style="background: rgba(0,0,0,0.05); color: var(--text-secondary);">MEMBER</span>';
            if (m.role === 'OWNER') {
                roleBadge = '<span class="status-badge danger" style="background: #ea580c; color: #fff;">OWNER</span>';
            } else if (m.role === 'ADMIN') {
                roleBadge = '<span class="status-badge" style="background: rgba(2,132,199,0.1); color: #0284c7; font-weight: 700;">ADMIN</span>';
            }
            
            return `
                <div class="comm-member-row" style="cursor: pointer;" onclick="closeViewCommunityModal(); window.viewUserDetails(${m.userId})">
                    <div class="user-avatar-sm" style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--mod-primary), #0284c7); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12px; overflow: hidden; flex-shrink: 0;">${avatarHtml}</div>
                    <div>
                        <div style="font-weight: 700; color: var(--text-primary); font-size: 14px;">${escapeHtml(m.fullName)}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">ID: ${m.userId} • Tham gia: ${new Date(m.joinedAt).toLocaleDateString('vi-VN')}</div>
                    </div>
                    <div style="margin-left: auto;">${roleBadge}</div>
                </div>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = '<p style="text-align: center; color: red; padding: 30px;">Lỗi khi tải danh sách thành viên.</p>';
    }
};

window.modLoadCommunityRulesTab = async function(id) {
    const container = document.getElementById('mod-comm-rules-content');
    if (!container) return;
    container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;">
            <div class="skeleton-rule-card"><div class="skeleton-box skeleton-rule-title"></div><div class="skeleton-box skeleton-rule-desc"></div></div>
            <div class="skeleton-rule-card"><div class="skeleton-box skeleton-rule-title" style="width:150px;"></div><div class="skeleton-box skeleton-rule-desc"></div></div>
        </div>
    `;
    
    try {
        const res = await fetch(`/api/communities/${id}/rules`);
        if (!res.ok) throw new Error();
        const rules = await res.json();
        
        if (!rules || rules.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 30px;">Cộng đồng chưa thiết lập quy tắc nhóm.</p>';
            return;
        }
        
        container.innerHTML = rules.map(r => `
            <div class="comm-rule-card">
                <div style="font-weight: 800; font-size: 14px; color: var(--text-primary); margin-bottom: 6px;">
                    ${r.ruleOrder}. ${escapeHtml(r.title)}
                </div>
                <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                    ${escapeHtml(r.description || '')}
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p style="text-align: center; color: red; padding: 30px;">Lỗi khi tải quy tắc nhóm.</p>';
    }
};

window.modLoadCommunityTopicsTab = async function(id) {
    const container = document.getElementById('mod-comm-topics-content');
    if (!container) return;
    container.innerHTML = `
        <div style="padding:15px; background: var(--surface-bg); border-radius: 10px; border: 1px solid var(--border-color); display: flex; flex-wrap: wrap; gap: 8px;"><div class="skeleton-box" style="width:80px;height:24px;border-radius:12px;"></div><div class="skeleton-box" style="width:100px;height:24px;border-radius:12px;"></div><div class="skeleton-box" style="width:70px;height:24px;border-radius:12px;"></div></div>
    `;
    
    try {
        const res = await fetch(`/api/communities/${id}/tags`);
        if (!res.ok) throw new Error();
        const tags = await res.json();
        
        if (!tags || tags.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 30px;">Cộng đồng chưa thiết lập chủ đề/tag.</p>';
            return;
        }
        
        container.innerHTML = `<div style="padding: 15px; background: var(--surface-bg); border-radius: 10px; border: 1px solid var(--border-color);">
            <div style="font-weight: 700; font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; text-transform: uppercase;">Các chủ đề trong nhóm:</div>
            <div style="display: flex; flex-wrap: wrap;">
                ${tags.map(t => `<span class="comm-tag-chip"><i class="fa-solid fa-hashtag"></i> ${escapeHtml(t)}</span>`).join('')}
            </div>
        </div>`;
    } catch (e) {
        container.innerHTML = '<p style="text-align: center; color: red; padding: 30px;">Lỗi khi tải chủ đề nhóm.</p>';
    }
};

window.modLoadCommunityStatsTab = async function(id) {
    const container = document.getElementById('mod-comm-stats-content');
    if (!container) return;
    container.innerHTML = `
        <div class="skeleton-stats-grid" style="margin-bottom:20px;">
            <div class="skeleton-stats-card"><div class="skeleton-box skeleton-stats-title"></div><div class="skeleton-box skeleton-stats-val"></div></div>
            <div class="skeleton-stats-card"><div class="skeleton-box skeleton-stats-title" style="width:80px;"></div><div class="skeleton-box skeleton-stats-val"></div></div>
            <div class="skeleton-stats-card"><div class="skeleton-box skeleton-stats-title" style="width:90px;"></div><div class="skeleton-box skeleton-stats-val"></div></div>
        </div>
        <div style="background: var(--surface-bg); border-radius: 12px; border: 1px solid var(--border-color); padding: 16px; height: 320px; display: flex; flex-direction: column; gap: 12px;">
            <div class="skeleton-box" style="width:200px;height:14px;"></div>
            <div class="skeleton-box" style="width:100%;flex:1;"></div>
        </div>
    `;
    
    try {
        const token = window.token || localStorage.getItem('token');
        const res = await fetch(`/api/communities/${id}/analytics`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error();
        const stats = await res.json();
        
        container.innerHTML = `
            <!-- Analytics Cards -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
                <div style="background: var(--surface-bg); border-radius: 10px; border: 1px solid var(--border-color); padding: 14px; border-left: 4px solid #0284c7;">
                    <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Thành viên mới (7 ngày)</div>
                    <div style="font-size: 22px; font-weight: 800; color: #0284c7;">${stats.newMembersCount}</div>
                </div>
                <div style="background: var(--surface-bg); border-radius: 10px; border: 1px solid var(--border-color); padding: 14px; border-left: 4px solid #8b5cf6;">
                    <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Bài viết mới (7 ngày)</div>
                    <div style="font-size: 22px; font-weight: 800; color: #8b5cf6;">${stats.newPostsCount}</div>
                </div>
                <div style="background: var(--surface-bg); border-radius: 10px; border: 1px solid var(--border-color); padding: 14px; border-left: 4px solid #f59e0b;">
                    <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Báo cáo mới (7 ngày)</div>
                    <div style="font-size: 22px; font-weight: 800; color: #f59e0b;">${stats.newReportsCount}</div>
                </div>
            </div>
            
            <!-- Chart Container -->
            <div style="background: var(--surface-bg); border-radius: 12px; border: 1px solid var(--border-color); padding: 16px;">
                <div style="font-weight: 700; font-size: 13px; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-chart-line" style="color: #0284c7;"></i> Biểu đồ xu hướng 7 ngày gần nhất
                </div>
                <div class="comm-chart-container">
                    <canvas id="mod-community-stats-chart"></canvas>
                </div>
            </div>
        `;
        
        // Render Chart.js
        setTimeout(() => {
            const ctx = document.getElementById('mod-community-stats-chart');
            if (!ctx) return;
            
            if (modCommunityChartInstance) {
                modCommunityChartInstance.destroy();
            }
            
            const labels = Object.keys(stats.membersDaily || {});
            const membersData = Object.values(stats.membersDaily || {});
            const postsData = Object.values(stats.postsDaily || {});
            
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
            const textColor = isDark ? '#93939f' : '#616161';
            
            modCommunityChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Thành viên mới',
                            data: membersData,
                            borderColor: '#0284c7',
                            backgroundColor: 'rgba(2, 132, 199, 0.05)',
                            tension: 0.3,
                            borderWidth: 2,
                            pointRadius: 3,
                            fill: true
                        },
                        {
                            label: 'Bài viết mới',
                            data: postsData,
                            borderColor: '#8b5cf6',
                            backgroundColor: 'rgba(139, 92, 246, 0.05)',
                            tension: 0.3,
                            borderWidth: 2,
                            pointRadius: 3,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: textColor,
                                font: { weight: '600', size: 11 }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: gridColor },
                            ticks: { color: textColor, font: { size: 10 } }
                        },
                        y: {
                            grid: { color: gridColor },
                            ticks: { 
                                color: textColor, 
                                font: { size: 10 },
                                stepSize: 1,
                                precision: 0
                            },
                            min: 0
                        }
                    }
                }
            });
        }, 100);
        
    } catch (e) {
        container.innerHTML = '<p style="text-align: center; color: red; padding: 30px;">Lỗi khi tải dữ liệu thống kê.</p>';
    }
};

window.closeViewCommunityModal = function() {
    const modal = document.getElementById('view-community-modal');
    if (modal) modal.style.display = 'none';
};

// ============================================================
// LOCK COMMUNITY
// ============================================================
window.openLockCommunityModal = function(communityId, communityName) {
    const modal = document.getElementById('lock-community-modal');
    if (!modal) return;

    document.getElementById('lock-community-id').value = communityId;
    document.getElementById('lock-community-name-text').textContent = communityName;
    document.getElementById('lock-community-duration').value = '24';
    document.getElementById('lock-community-reason').value = '';
    document.getElementById('lock-community-custom-container').style.display = 'none';

    modal.style.display = 'flex';
};

window.closeLockCommunityModal = function() {
    const modal = document.getElementById('lock-community-modal');
    if (modal) modal.style.display = 'none';
};

window.toggleCommunityCustomDuration = function() {
    const val = document.getElementById('lock-community-duration').value;
    document.getElementById('lock-community-custom-container').style.display = val === 'custom' ? 'block' : 'none';
};

window.submitLockCommunity = async function() {
    const communityId = document.getElementById('lock-community-id').value;
    const reason = document.getElementById('lock-community-reason').value.trim();
    const durationSelect = document.getElementById('lock-community-duration').value;

    if (!reason) {
        showCustomAlert('Thiếu thông tin', 'Vui lòng nhập lý do khóa cộng đồng.', 'error');
        return;
    }

    let durationHours;
    if (durationSelect === 'custom') {
        const customVal = parseInt(document.getElementById('lock-community-custom-value').value);
        const unit = document.getElementById('lock-community-custom-unit').value;
        if (!customVal || customVal < 1) {
            showCustomAlert('Thiếu thông tin', 'Vui lòng nhập thời hạn hợp lệ.', 'error');
            return;
        }
        durationHours = unit === 'DAYS' ? customVal * 24 : customVal;
    } else {
        durationHours = parseInt(durationSelect);
    }

    try {
        const res = await fetch(`/api/moderator/communities/${communityId}/lock`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${window.token || localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ durationHours, reason })
        });

        if (res.ok) {
            closeLockCommunityModal();
            showCustomAlert('Thành công', `Đã khóa cộng đồng ${durationHours} tiếng. Thông báo đã được gửi đến tất cả thành viên.`, 'success');
            if (window.appendActionLog) appendActionLog('Khóa cộng đồng', `Group-${communityId}`);
            await loadCommunities();
        } else {
            const msg = await res.text();
            showCustomAlert('Lỗi', msg || 'Lỗi khi khóa cộng đồng.', 'error');
        }
    } catch (e) {
        console.error(e);
        showCustomAlert('Lỗi kết nối', 'Không thể kết nối đến máy chủ.', 'error');
    }
};

window.unlockCommunity = async function(communityId, communityName) {
    showCustomConfirm(
        'Mở khóa cộng đồng',
        `Bạn có chắc muốn MỞ KHÓA cộng đồng "<b>${communityName}</b>"? Thành viên sẽ có thể đăng bài và tương tác trở lại.`,
        async () => {
            try {
                const res = await fetch(`/api/moderator/communities/${communityId}/unlock`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${window.token || localStorage.getItem('token')}` }
                });

                if (res.ok) {
                    showCustomAlert('Thành công', `Đã mở khóa cộng đồng ${communityName}.`, 'success');
                    if (window.appendActionLog) appendActionLog('Mở khóa cộng đồng', `Group-${communityId}`);
                    await loadCommunities();
                } else {
                    const msg = await res.text();
                    showCustomAlert('Lỗi', msg || 'Lỗi khi mở khóa cộng đồng.', 'error');
                }
            } catch (e) {
                console.error(e);
                showCustomAlert('Lỗi kết nối', 'Không thể kết nối đến máy chủ.', 'error');
            }
        },
        '#22c55e'
    );
};

// ============================================================
// DELETE COMMUNITY
// ============================================================
async function deleteCommunity(communityId, communityName) {
    if (typeof showCustomConfirm !== 'function') {
        window.showToast("Lỗi hệ thống: Tính năng xác nhận chưa được tải!", "error");
        return;
    }

    showCustomConfirm(
        'Xóa cộng đồng', 
        `Bạn có chắc chắn muốn XÓA vĩnh viễn cộng đồng "<b>${communityName}</b>"? <br><br>Hành động này sẽ gỡ bỏ tất cả bài viết liên quan, giải tán thành viên và <b>gửi thông báo đến tất cả thành viên</b>. Không thể hoàn tác!`, 
        async () => {
            try {
                const res = await fetch(`/api/moderator/communities/${communityId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${window.token || localStorage.getItem('token')}` }
                });

                if (res.ok) {
                    showCustomAlert('Thành công', `Đã xóa cộng đồng ${communityName} thành công. Thông báo đã được gửi đến các thành viên.`, 'success');
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

// ============================================================
// FILTER & SEARCH EVENT LISTENERS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('communities-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', applyCommunitiesFilter);
    }

    const statusFilter = document.getElementById('communities-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', applyCommunitiesFilter);
    }

    // Close modals when clicking backdrop
    document.getElementById('lock-community-modal')?.addEventListener('click', function(e) {
        if (e.target === this) closeLockCommunityModal();
    });
    document.getElementById('view-community-modal')?.addEventListener('click', function(e) {
        if (e.target === this) closeViewCommunityModal();
    });
});
