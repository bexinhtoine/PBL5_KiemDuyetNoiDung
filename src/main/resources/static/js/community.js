document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const communityId = urlParams.get('id');
    
    if (!communityId) {
        window.location.href = '/html/communities.html';
        return;
    }
    
    window.currentCommunityId = communityId;
    window.fetchPosts = (token) => loadCommunityPosts(token, communityId);
    
    fetchUserProfile(token);
});

async function fetchUserProfile(token) {
    try {
        const res = await fetch('/api/users/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            window.currentUser = data;
            
            let avatarUrl = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName)}&background=5e6ad2&color=fff`;
            document.querySelectorAll('#header-avatar, .avatar-large, .avatar-small, #modal-avatar, #create-post-avatar').forEach(img => {
                img.src = avatarUrl;
            });

            document.querySelectorAll('.user-name').forEach(el => {
                el.textContent = data.fullName || 'Người dùng';
            });

            loadCommunityDetails(token, window.currentCommunityId);
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadCommunityDetails(token, id) {
    try {
        const detailRes = await fetch(`/api/communities/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });

        if (detailRes.ok) {
            const community = await detailRes.json();
            window.currentCommunity = community;

            const isMember = community.membershipStatus === 'ACTIVE';
            const isPending = community.membershipStatus === 'PENDING';
            const isCreator = community.creatorId === window.currentUser.id || community.membershipRole === 'OWNER';
            const isAdmin = community.membershipRole === 'ADMIN';

            renderCommunityHeader(community, isMember, isCreator, isPending);
            
            if (!community.isPrivate || isMember || isCreator || isAdmin || window.currentUser.role === 'ADMIN' || window.currentUser.role === 'MODERATOR') {
                document.getElementById('community-create-post-box').style.display = 'block';
                // Attach communityId to post creation logic
                window.postCommunityId = community.id;
                loadPinnedPosts(token, id);
                loadCommunityPosts(token, id);
                if (typeof window.loadCommunityTags === 'function') {
                    window.loadCommunityTags();
                }
            } else {
                document.getElementById('skeleton-posts').style.display = 'none';
                document.getElementById('private-community-warning').style.display = 'block';
            }

            fetchMemberCount(token, id);

            // Auto-open management section if tab=manage in URL
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('tab') === 'manage' && (isCreator || isAdmin)) {
                showManageSection();
            }
        } else {
            showToast("Lỗi khi tải thông tin cộng đồng", "error");
        }
    } catch(e) {
        console.error(e);
    }
}

async function fetchMemberCount(token, id) {
    try {
        const res = await fetch(`/api/communities/${id}/members?status=ACTIVE`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const members = await res.json();
            const countEl = document.getElementById('community-members-count');
            if (countEl) {
                countEl.textContent = `${members.length} thành viên`;
            }
        }
    } catch (e) {
        console.error(e);
    }
}

function renderCommunityHeader(community, isMember, isCreator, isPending) {
    document.getElementById('community-name').textContent = community.name;
    document.getElementById('community-description').textContent = community.description || 'Chưa có mô tả';
    
    if (community.coverUrl) {
        document.getElementById('community-cover').src = community.coverUrl;
    }
    
    const avatarEl = document.getElementById('community-avatar');
    const placeholder = document.getElementById('community-avatar-placeholder');
    if (community.avatarUrl) {
        avatarEl.src = community.avatarUrl;
        avatarEl.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        avatarEl.style.display = 'none';
        placeholder.style.display = 'block';
    }

    const privacyIcon = document.getElementById('community-privacy-icon');
    if (community.isPrivate || community.privacyStatus === 'PRIVATE') {
        privacyIcon.innerHTML = '<i class="fa-solid fa-lock"></i> Cộng đồng riêng tư';
    } else {
        privacyIcon.innerHTML = '<i class="fa-solid fa-globe"></i> Cộng đồng công khai';
    }

    const btn = document.getElementById('btn-community-action');
    const actionContainer = document.getElementById('community-actions-container') || (btn ? btn.parentElement : null);
    
    const isOwner = community.creatorId === window.currentUser.id || community.membershipRole === 'OWNER';
    const isAdmin = community.membershipRole === 'ADMIN';
    window.isCurrentCommunityManager = isOwner || isAdmin;
    window.isCurrentCommunityOwner = isOwner;

    if (actionContainer) {
        if (isOwner) {
            actionContainer.innerHTML = `
                <button class="community-btn community-btn-secondary" onclick="showManageSection()"><i class="fa-solid fa-gear"></i> Quản lý</button>
                <button class="community-btn community-btn-primary" onclick="openInviteFriendsModal()"><i class="fa-solid fa-user-plus"></i> Mời bạn bè</button>
                <button class="community-btn community-btn-warning" onclick="openEditCommunityModal()"><i class="fa-solid fa-pen-to-square"></i> Chỉnh sửa</button>
                <button class="community-btn community-btn-danger" onclick="disbandCommunity()"><i class="fa-solid fa-trash-can"></i> Giải tán</button>
            `;
        } else if (isAdmin) {
            actionContainer.innerHTML = `
                <button class="community-btn community-btn-secondary" onclick="showManageSection()"><i class="fa-solid fa-gear"></i> Quản lý</button>
                <button class="community-btn community-btn-primary" onclick="openInviteFriendsModal()"><i class="fa-solid fa-user-plus"></i> Mời bạn bè</button>
            `;
        } else {
            if (isMember) {
                actionContainer.innerHTML = `
                    <button class="community-btn community-btn-primary" onclick="openInviteFriendsModal()"><i class="fa-solid fa-user-plus"></i> Mời bạn bè</button>
                    <button id="btn-community-action" class="community-btn community-btn-outline" onclick="leaveCommunity(${community.id})"><i class="fa-solid fa-right-from-bracket"></i> Rời nhóm</button>
                `;
            } else if (isPending) {
                actionContainer.innerHTML = `
                    <button id="btn-community-action" class="community-btn community-btn-outline" onclick="leaveCommunity(${community.id}, true)"><i class="fa-solid fa-xmark"></i> Hủy yêu cầu</button>
                `;
            } else {
                actionContainer.innerHTML = `
                    <button id="btn-community-action" class="community-btn community-btn-primary" onclick="joinCommunity(${community.id})"><i class="fa-solid fa-right-to-bracket"></i> Tham gia</button>
                `;
            }
        }
    }

    const adminInfoEl = document.getElementById('community-admin-info');
    if (adminInfoEl) {
        const creatorAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(community.creatorName)}&background=5e6ad2&color=fff`;
        adminInfoEl.innerHTML = `
            <a href="/html/profile.html?userId=${community.creatorId}" style="display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit;">
                <img src="${creatorAvatar}" alt="Admin Avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <span style="font-weight: 600;">${escapeHtml(community.creatorName)}</span>
            </a>
        `;
    }
}

window.showManageSection = function() {
    const section = document.getElementById('community-manage-section');
    const layout = document.querySelector('.main-layout');
    if (section) {
        if (layout) {
            layout.classList.add('manage-mode-active');
        }
        section.style.display = 'block';
        updateAllManageCounts();
        switchManageTab('pending');
        // Smooth scroll to top of window
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.hideManageSection = function() {
    const section = document.getElementById('community-manage-section');
    const layout = document.querySelector('.main-layout');
    if (section) {
        if (layout) {
            layout.classList.remove('manage-mode-active');
        }
        section.style.display = 'none';
    }
    // Remove tab param from URL
    const url = new URL(window.location);
    url.searchParams.delete('tab');
    window.history.replaceState({}, '', url);
};

window.switchManageTab = function(tab) {
    const tabs = ['pending', 'active', 'reports', 'blocked', 'posts', 'rules', 'tags', 'logs', 'analytics'];
    tabs.forEach(t => {
        const tabBtn = document.getElementById(`manage-tab-${t}`);
        const section = document.getElementById(`manage-list-${t}`);
        if (tabBtn && section) {
            if (t === tab) {
                tabBtn.classList.add('active');
                section.style.display = 'block';
            } else {
                tabBtn.classList.remove('active');
                section.style.display = 'none';
            }
        }
    });

    if (tab === 'pending' || tab === 'active') {
        fetchManageMembers(tab);
    } else if (tab === 'reports') {
        fetchCommunityReports();
    } else if (tab === 'blocked') {
        fetchManageMembers('blocked');
    } else if (tab === 'posts') {
        fetchPendingPosts();
    } else if (tab === 'rules') {
        fetchCommunityRulesManage();
    } else if (tab === 'tags') {
        window.loadCommunityTags();
    } else if (tab === 'logs') {
        window.currentLogsPage = 0;
        fetchCommunityLogs();
    } else if (tab === 'analytics') {
        loadCommunityAnalytics();
    }
};

async function fetchCommunityReports() {
    const container = document.getElementById('manage-list-reports');
    if (!container) return;
    
    container.innerHTML = Array(3).fill(0).map(() => `
        <div style="display: flex; align-items: flex-start; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; align-items: flex-start; gap: 12px; flex: 1;">
                <div class="skeleton-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; flex-shrink: 0;"></div>
                <div style="flex: 1;">
                    <div class="skeleton-line" style="height: 14px; width: 30%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; margin-bottom: 8px; border-radius: 4px;"></div>
                    <div class="skeleton-line" style="height: 12px; width: 60%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; margin-bottom: 6px; border-radius: 4px;"></div>
                    <div class="skeleton-line" style="height: 10px; width: 80%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; border-radius: 4px;"></div>
                </div>
            </div>
            <div class="skeleton-line" style="height: 20px; width: 60px; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; border-radius: 12px;"></div>
        </div>
    `).join('');
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const reports = await res.json();
            const countEl = document.getElementById('count-reports');
            if (countEl) countEl.textContent = reports.length;
            
            if (reports.length === 0) {
                container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fa-solid fa-check-circle" style="font-size: 36px; margin-bottom: 10px; display: block; color: #10b981;"></i>
                    Chưa có báo cáo nào trong cộng đồng này.
                </div>`;
                return;
            }
            
            container.innerHTML = reports.map(r => {
                const avatar = r.reporterAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.reporterName || 'User')}&background=5e6ad2&color=fff`;
                const statusColor = r.status === 'PENDING' ? '#faad14' : (r.status === 'RESOLVED' ? '#10b981' : '#ff4d4f');
                const statusText = r.status === 'PENDING' ? 'Đang chờ' : (r.status === 'RESOLVED' ? 'Đã xử lý' : r.status);
                
                let reportActions = '';
                if (r.status === 'PENDING') {
                    reportActions = `
                        <div style="display: flex; gap: 8px; margin-top: 8px;">
                            <button class="btn btn-primary" style="padding: 4px 10px; font-size: 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600;" onclick="resolveGroupReport(${r.id}, 'RESOLVED', 'DELETE')">Gỡ bài</button>
                            <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px; border-radius: 6px; border: 1px solid var(--border-color); cursor: pointer; font-weight: 600;" onclick="resolveGroupReport(${r.id}, 'DISMISSED')">Bỏ qua</button>
                        </div>
                    `;
                }

                return `
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: flex-start; gap: 12px; flex: 1;">
                            <img src="${avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <div style="font-weight: 600; color: var(--text-main); margin-bottom: 4px;">${r.reporterName || 'Người dùng'}</div>
                                <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 6px;">
                                    <i class="fa-solid fa-flag" style="color: #ff4d4f; margin-right: 4px;"></i>
                                    ${escapeHtml(r.reason || 'Không có lý do')}
                                </div>
                                <div style="font-size: 12px; color: var(--text-muted);">
                                    ${r.postContent ? '<i class="fa-regular fa-file-lines" style="margin-right: 4px;"></i> Bài viết: "' + escapeHtml(r.postContent.substring(0, 80)) + (r.postContent.length > 80 ? '...' : '') + '"' : ''}
                                </div>
                                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                                    ${r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : ''}
                                </div>
                                ${reportActions}
                            </div>
                        </div>
                        <span style="font-size: 12px; padding: 3px 10px; border-radius: 12px; font-weight: 600; background: ${statusColor}22; color: ${statusColor};">${statusText}</span>
                    </div>
                `;
            }).join('');
        } else if (res.status === 404) {
            container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-check-circle" style="font-size: 36px; margin-bottom: 10px; display: block; color: #10b981;"></i>
                Chưa có báo cáo nào trong cộng đồng này.
            </div>`;
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Lỗi tải báo cáo.</div>';
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-check-circle" style="font-size: 36px; margin-bottom: 10px; display: block; color: #10b981;"></i>
            Chưa có báo cáo nào trong cộng đồng này.
        </div>`;
    }
}

async function fetchManageMembers(status) {
    const token = localStorage.getItem('token');
    const container = document.getElementById(`manage-list-${status}`);
    if (!container) return;

    container.innerHTML = Array(3).fill(0).map(() => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <div class="skeleton-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; flex-shrink: 0;"></div>
                <div style="flex: 1;">
                    <div class="skeleton-line" style="height: 14px; width: 40%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; margin-bottom: 6px; border-radius: 4px;"></div>
                    <div class="skeleton-line" style="height: 10px; width: 25%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; border-radius: 4px;"></div>
                </div>
            </div>
            <div class="skeleton-line" style="height: 32px; width: 80px; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; border-radius: 6px;"></div>
        </div>
    `).join('');

    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/members?status=${status.toUpperCase()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const list = await res.json();
            
            // Update counts
            const countEl = document.getElementById(`count-${status}`);
            if (countEl) countEl.textContent = list.length;

            if (list.length === 0) {
                container.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted);">Không có ${status === 'pending' ? 'yêu cầu nào' : (status === 'blocked' ? 'người dùng bị chặn nào' : 'thành viên nào')}.</div>`;
                return;
            }

            container.innerHTML = list.map(m => {
                const avatar = m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fullName)}&background=5e6ad2&color=fff`;
                let actionBtn = '';
                
                if (status === 'pending') {
                    actionBtn = `
                        <button class="btn btn-primary" style="padding: 6px 12px; font-size: 13px; border-radius: 6px; cursor: pointer;" onclick="doApproveMember(${m.userId})">Phê duyệt</button>
                        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 13px; border-radius: 6px; cursor: pointer;" onclick="doKickMember(${m.userId}, 'từ chối')">Từ chối</button>
                    `;
                } else if (status === 'blocked') {
                    actionBtn = `
                        <button class="btn btn-primary" style="padding: 6px 12px; font-size: 13px; border-radius: 6px; cursor: pointer;" onclick="doUnbanMember(${m.userId})">Mở chặn</button>
                    `;
                } else {
                    // status === 'active'
                    if (m.role !== 'OWNER' && window.currentUser.id !== m.userId) {
                        const isOwnerOfGroup = window.currentCommunity.creatorId === window.currentUser.id;
                        let promoteBtn = '';
                        let banBtn = '';
                        if (isOwnerOfGroup) {
                            if (m.role === 'ADMIN') {
                                promoteBtn = `<button class="btn btn-secondary" style="padding: 6px 12px; font-size: 13px; border-radius: 6px; cursor: pointer;" onclick="changeMemberRole(${m.userId}, 'MEMBER')">Bãi nhiệm</button>`;
                            } else {
                                promoteBtn = `<button class="btn btn-primary" style="padding: 6px 12px; font-size: 13px; border-radius: 6px; cursor: pointer;" onclick="changeMemberRole(${m.userId}, 'ADMIN')">Bổ nhiệm Admin</button>`;
                            }
                            banBtn = `<button class="btn btn-danger" style="padding: 6px 12px; font-size: 13px; border-radius: 6px; background: #fa541c; color: white; border: none; cursor: pointer; font-weight: 600;" onclick="doBanMember(${m.userId})">Chặn</button>`;
                        }
                        
                        actionBtn = `
                            ${promoteBtn}
                            <button class="btn btn-danger" style="padding: 6px 12px; font-size: 13px; border-radius: 6px; background: var(--red-icon); color: white; border: none; cursor: pointer;" onclick="doKickMember(${m.userId})">Trục xuất</button>
                            ${banBtn}
                        `;
                    } else if (m.role === 'OWNER') {
                        actionBtn = `<span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Chủ sở hữu</span>`;
                    }
                }

                const roleLabel = m.role === 'ADMIN' ? '<span style="font-size: 11px; padding: 2px 6px; background: rgba(94, 106, 210, 0.15); color: var(--primary-color); border-radius: 4px; font-weight: 600; margin-left: 5px;">Phó nhóm</span>' : '';

                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <div style="font-weight: 600; color: var(--text-main); display: flex; align-items: center;">${m.fullName} ${roleLabel}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">Tham gia ${new Date(m.joinedAt).toLocaleDateString('vi-VN')}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                            ${actionBtn}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Lỗi tải danh sách.</div>';
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Lỗi kết nối.</div>';
    }
}

window.doApproveMember = async function(userId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/approve/${userId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Đã phê duyệt thành viên", "success");
            fetchManageMembers('pending');
            // update header count
            fetchMemberCount(token, window.currentCommunityId);
        } else {
            showToast(await res.text(), "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
    }
};

window.doKickMember = function(userId, actionName = 'trục xuất') {
    showConfirmModal(
        actionName === 'từ chối' ? 'Từ chối yêu cầu' : 'Trục xuất thành viên',
        `Bạn có chắc chắn muốn ${actionName} người dùng này?`,
        async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`/api/communities/${window.currentCommunityId}/kick/${userId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    showToast(actionName === 'từ chối' ? "Đã từ chối yêu cầu" : "Đã trục xuất thành viên", "success");
                    fetchManageMembers(actionName === 'từ chối' ? 'pending' : 'active');
                    fetchMemberCount(token, window.currentCommunityId);
                } else {
                    showToast(await res.text(), "error");
                }
            } catch (e) {
                showToast("Lỗi kết nối", "error");
            }
        }
    );
};

async function joinCommunity(id) {
    const token = localStorage.getItem('token');
    if (window.currentCommunity && window.currentCommunity.isPrivate) {
        try {
            const rulesRes = await fetch(`/api/communities/${id}/rules`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (rulesRes.ok) {
                const rules = await rulesRes.json();
                if (rules && rules.length > 0) {
                    const listContainer = document.getElementById('join-rules-list');
                    listContainer.innerHTML = rules.map((r, index) => `
                        <div style="padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-main);">
                            <div style="font-weight: 700; font-size: 14px; margin-bottom: 5px; color: var(--text-main);">${index + 1}. ${escapeHtml(r.title)}</div>
                            <div style="font-size: 13px; color: var(--text-muted); line-height: 1.4;">${escapeHtml(r.description)}</div>
                        </div>
                    `).join('');
                    
                    document.getElementById('agree-rules-check').checked = false;
                    toggleJoinRulesButton(false);
                    document.getElementById('join-rules-modal').style.display = 'flex';
                    window.pendingJoinCommunityId = id;
                    return;
                }
            }
        } catch (e) {
            console.error("Lỗi khi tải quy tắc kiểm tra", e);
        }
    }
    performJoinCommunity(id);
}

window.toggleJoinRulesButton = function(checked) {
    const btn = document.getElementById('btn-submit-join-rules');
    if (btn) {
        btn.disabled = !checked;
        if (checked) {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        } else {
            btn.style.opacity = '0.6';
            btn.style.cursor = 'not-allowed';
        }
    }
};

window.closeJoinRulesModal = function() {
    document.getElementById('join-rules-modal').style.display = 'none';
};

window.submitJoinWithRules = function() {
    closeJoinRulesModal();
    if (window.pendingJoinCommunityId) {
        performJoinCommunity(window.pendingJoinCommunityId);
    }
};

async function performJoinCommunity(id) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${id}/join`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast(await res.text(), "success");
            location.reload();
        } else {
            showToast(await res.text(), "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
    }
}

function leaveCommunity(id, isPending = false) {
    const title = isPending ? 'Hủy yêu cầu tham gia' : 'Rời cộng đồng';
    const message = isPending ? 'Bạn có chắc chắn muốn hủy yêu cầu tham gia cộng đồng này?' : 'Bạn có chắc chắn muốn rời khỏi cộng đồng này?';

    showConfirmModal(title, message, async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/communities/${id}/leave`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast(await res.text(), "success");
                setTimeout(() => {
                    location.reload();
                }, 1500);
            } else {
                showToast(await res.text(), "error");
            }
        } catch (e) {
            showToast("Lỗi kết nối", "error");
        }
    });
}

async function loadCommunityPosts(token, id, search = '', tag = '') {
    const container = document.getElementById('posts-container');
    if (container) {
        container.innerHTML = Array(2).fill(0).map(() => `
            <div class="card skeleton-post" style="padding: 16px; margin-bottom: 16px; border-radius: 8px;">
                <div class="skeleton-header" style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                    <div class="skeleton-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out;"></div>
                    <div class="skeleton-meta" style="flex: 1;">
                        <div class="skeleton-line" style="height: 12px; width: 30%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; margin-bottom: 6px; border-radius: 4px;"></div>
                        <div class="skeleton-line" style="height: 10px; width: 15%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; border-radius: 4px;"></div>
                    </div>
                </div>
                <div class="skeleton-content">
                    <div class="skeleton-line" style="height: 14px; width: 90%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; margin-bottom: 8px; border-radius: 4px;"></div>
                    <div class="skeleton-line" style="height: 14px; width: 75%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; border-radius: 4px;"></div>
                </div>
            </div>
        `).join('');
    }
    try {
        let url = `/api/communities/${id}/posts`;
        const params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (tag) params.push(`tag=${encodeURIComponent(tag)}`);
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const posts = await res.json();
            renderPosts(posts, token);
        } else {
            if (container) container.innerHTML = '<div style="text-align: center; color: #65676B; padding: 20px;">Lỗi tải bài viết.</div>';
        }
    } catch(e) {
        console.error(e);
    }
}

function timeSince(dateString) {
    const postDate = new Date(dateString);
    if (Number.isNaN(postDate.getTime())) return 'Vừa xong';
    const seconds = Math.floor((new Date() - postDate) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " năm trước";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " tháng trước";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " ngày trước";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " giờ trước";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " phút trước";
    return Math.floor(seconds) + " giây trước";
}

function escapeHtml(unsafe) {
    return (unsafe || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\n/g, "<br>");
}

function renderPosts(posts, token) {
    const container = document.getElementById('posts-container');
    if (posts.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #65676B; padding: 30px; background: var(--card-bg); border-radius: 8px;">Cộng đồng này chưa có bài viết nào.</div>';
        return;
    }
    
    let allPostsHtml = '';
    posts.forEach(post => {
        const isMine = post.authorId === window.currentUser.id;
        const isManager = window.isCurrentCommunityManager;
        
        let dropdownHtml = '';
        if (isMine) {
            dropdownHtml = `
                <a href="javascript:void(0)" onclick="toggleBookmark(${post.id})" style="display: flex; align-items: center; gap: 8px; padding: 10px 15px; text-decoration: none; color: var(--text-main); font-size: 13px; font-weight: 600;"><i class="fa-regular fa-bookmark"></i> Lưu bài viết</a>
                <a href="javascript:void(0)" onclick="hidePost(${post.id})" style="display: flex; align-items: center; gap: 8px; padding: 10px 15px; text-decoration: none; color: var(--text-main); font-size: 13px; font-weight: 600;"><i class="fa-solid fa-eye-slash"></i> Ẩn bài viết</a>
                <div style="height: 1px; background: var(--border-color); margin: 4px 0;"></div>
                <a href="javascript:void(0)" onclick="deletePost(${post.id})" style="color: var(--red-icon); display: flex; align-items: center; gap: 8px; padding: 10px 15px; text-decoration: none; font-size: 13px; font-weight: 600;"><i class="fa-regular fa-trash-can"></i> Xóa bài viết</a>
            `;
            if (isManager) {
                dropdownHtml += `
                    <div style="height: 1px; background: var(--border-color); margin: 4px 0;"></div>
                    ${post.pinned ? `
                        <a href="javascript:void(0)" onclick="unpinPost(${post.id})" style="display: flex; align-items: center; gap: 8px; padding: 10px 15px; text-decoration: none; color: var(--text-main); font-size: 13px; font-weight: 600;"><i class="fa-solid fa-thumbtack" style="transform: rotate(45deg); color: var(--primary-color);"></i> Bỏ ghim bài viết</a>
                    ` : `
                        <a href="javascript:void(0)" onclick="pinPost(${post.id})" style="display: flex; align-items: center; gap: 8px; padding: 10px 15px; text-decoration: none; color: var(--text-main); font-size: 13px; font-weight: 600;"><i class="fa-solid fa-thumbtack"></i> Ghim bài viết</a>
                    `}
                `;
            }
        } else if (isManager) {
            dropdownHtml = `
                <a href="javascript:void(0)" onclick="toggleBookmark(${post.id})" style="display: flex; align-items: center; gap: 8px; padding: 10px 15px; text-decoration: none; color: var(--text-main); font-size: 13px; font-weight: 600;"><i class="fa-regular fa-bookmark"></i> Lưu bài viết</a>
                <a href="javascript:void(0)" onclick="hidePost(${post.id})" style="display: flex; align-items: center; gap: 8px; padding: 10px 15px; text-decoration: none; color: var(--text-main); font-size: 13px; font-weight: 600;"><i class="fa-solid fa-eye-slash"></i> Ẩn bài viết</a>
                <div style="height: 1px; background: var(--border-color); margin: 4px 0;"></div>
                <a href="javascript:void(0)" onclick="deletePost(${post.id})" style="color: var(--red-icon); display: flex; align-items: center; gap: 8px; padding: 10px 15px; text-decoration: none; font-size: 13px; font-weight: 600;"><i class="fa-regular fa-trash-can"></i> Gỡ bài viết (BQT)</a>
                <div style="height: 1px; background: var(--border-color); margin: 4px 0;"></div>
                ${post.pinned ? `
                    <a href="javascript:void(0)" onclick="unpinPost(${post.id})" style="display: flex; align-items: center; gap: 8px; padding: 10px 15px; text-decoration: none; color: var(--text-main); font-size: 13px; font-weight: 600;"><i class="fa-solid fa-thumbtack" style="transform: rotate(45deg); color: var(--primary-color);"></i> Bỏ ghim bài viết</a>
                ` : `
                    <a href="javascript:void(0)" onclick="pinPost(${post.id})" style="display: flex; align-items: center; gap: 8px; padding: 10px 15px; text-decoration: none; color: var(--text-main); font-size: 13px; font-weight: 600;"><i class="fa-solid fa-thumbtack"></i> Ghim bài viết</a>
                `}
            `;
        } else {
            dropdownHtml = `
                <a href="javascript:void(0)" onclick="toggleBookmark(${post.id})" style="display: flex; align-items: center; gap: 8px; padding: 10px 15px; text-decoration: none; color: var(--text-main); font-size: 13px; font-weight: 600;"><i class="fa-regular fa-bookmark"></i> Lưu bài viết</a>
                <a href="javascript:void(0)" onclick="hidePost(${post.id})" style="display: flex; align-items: center; gap: 8px; padding: 10px 15px; text-decoration: none; color: var(--text-main); font-size: 13px; font-weight: 600;"><i class="fa-solid fa-eye-slash"></i> Ẩn bài viết này</a>
                <div style="height: 1px; background: var(--border-color); margin: 4px 0;"></div>
                <a href="javascript:void(0)" onclick="reportPostToTarget(${post.id}, 'COMMUNITY')" style="display: flex; align-items: center; gap: 8px; padding: 10px 15px; text-decoration: none; color: var(--text-main); font-size: 13px; font-weight: 600;"><i class="fa-regular fa-flag"></i> Báo cáo với chủ nhóm</a>
                <a href="javascript:void(0)" onclick="reportPostToTarget(${post.id}, 'SYSTEM')" style="display: flex; align-items: center; gap: 8px; padding: 10px 15px; text-decoration: none; color: var(--text-main); font-size: 13px; font-weight: 600;"><i class="fa-solid fa-shield-halved"></i> Báo cáo với quản trị riêng</a>
            `;
        }

        const optionsHtml = `
        <div class="post-options" style="position: absolute; top: 20px; right: 20px; z-index: 10;">
            <button class="options-btn" onclick="toggleDropdown(${post.id})" style="background: none; border: none; font-size: 18px; color: var(--text-muted); cursor: pointer; padding: 5px;">
                <i class="fa-solid fa-ellipsis"></i>
            </button>
            <div id="dropdown-${post.id}" class="dropdown-content" style="display: none; position: absolute; right: 0; top: 30px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); width: 200px; z-index: 100;">
                ${dropdownHtml}
            </div>
        </div>
        `;

        let tagsHtml = '';
        if (post.tags && post.tags.length > 0) {
            tagsHtml = `
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; margin-bottom: 8px;">
                    ${post.tags.map(t => `<span style="font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 4px; background: var(--primary-light); color: var(--primary-color);">#${escapeHtml(t.name || t)}</span>`).join('')}
                </div>
            `;
        }

        let postHtml = `
        <article class="card post" id="post-${post.id}" style="position: relative;">
            <div class="post-header">
                <a href="/html/profile.html?userId=${post.authorId}">
                    <img src="${post.authorAvatar || '/uploads/default-avatar.png'}" alt="Avatar" class="avatar-medium">
                </a>
                <div class="post-meta">
                    <h4 class="post-author">
                        <a href="/html/profile.html?userId=${post.authorId}" style="text-decoration:none; color:inherit;">${escapeHtml(post.authorName)}</a>
                    </h4>
                    <span class="post-time">${timeSince(post.createdAt)}</span>
                </div>
            </div>
            
            ${optionsHtml}
            
            <div class="post-content">
                <p>${escapeHtml(post.content || '')}</p>
                ${tagsHtml}
            </div>
        `;

        if (post.imageUrl) {
            postHtml += `<div class="post-image-placeholder text-center"><img src="${post.imageUrl}" style="max-width: 100%; border-radius: 8px; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;"></div>`;
        }
        if (post.videoUrl) {
            postHtml += `<div class="post-video-placeholder text-center"><video src="${post.videoUrl}" controls style="max-width: 100%; border-radius: 8px; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto; max-height: 400px; background: #000;"></video></div>`;
        }

        const likeIcon = post.likedByCurrentUser ? 'fa-solid text-red' : 'fa-regular';
        const likeStyle = post.likedByCurrentUser ? 'color: var(--red-icon);' : '';

        postHtml += `
            <div class="post-actions-bar">
                <button id="like-btn-${post.id}" class="interaction-btn" onclick="toggleLike(${post.id})" style="${likeStyle}">
                    <i id="like-icon-${post.id}" class="${likeIcon} fa-heart"></i> <span id="like-count-${post.id}">Mọi người (${post.likeCount})</span>
                </button>
                <button class="interaction-btn" onclick="location.href='/html/post.html?id=${post.id}'">
                    <i class="fa-regular fa-comment"></i> Bình luận (${post.commentCount})
                </button>
                <button id="bookmark-btn-${post.id}" class="interaction-btn" onclick="toggleBookmark(${post.id})" style="margin-left: auto; ${post.bookmarkedByCurrentUser ? 'color: var(--primary-color);' : ''}">
                    <i class="${post.bookmarkedByCurrentUser ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
                </button>
            </div>
        </article>
        `;
        allPostsHtml += postHtml;
    });
    container.innerHTML = allPostsHtml;
}

async function toggleLike(postId) {
    const token = localStorage.getItem('token');
    
    // UI Cập nhật tức thì (Optimistic UI)
    const likeBtn = document.getElementById(`like-btn-${postId}`);
    const likeIcon = document.getElementById(`like-icon-${postId}`);
    const likeCountSpan = document.getElementById(`like-count-${postId}`);

    if (likeBtn && likeIcon && likeCountSpan) {
        const isLiked = likeIcon.classList.contains('fa-solid');

        let currentCount = 0;
        const countMatch = likeCountSpan.innerText.match(/\d+/);
        if (countMatch) {
            currentCount = parseInt(countMatch[0], 10);
        }

        if (isLiked) {
            // Đổi thành chưa like
            likeIcon.classList.remove('fa-solid', 'text-red');
            likeIcon.classList.add('fa-regular');
            likeBtn.style.color = '';
            likeCountSpan.innerText = `Mọi người (${Math.max(0, currentCount - 1)})`;
        } else {
            // Đổi thành đã like
            likeIcon.classList.remove('fa-regular');
            likeIcon.classList.add('fa-solid', 'text-red');
            likeBtn.style.color = 'var(--red-icon)';
            likeCountSpan.innerText = `Mọi người (${currentCount + 1})`;
            
            // Hiệu ứng tim bay GSAP
            if (window.animateHeartBurst) {
                window.animateHeartBurst(likeIcon);
            }
        }
    }

    try {
        const res = await fetch(`/api/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            console.error("Lỗi khi cập nhật like trên server");
        }
    } catch (err) {
        console.error(err);
    }
}

async function toggleBookmark(postId) {
    const token = localStorage.getItem('token');
    const btn = document.getElementById(`bookmark-btn-${postId}`);
    if (!btn) return;

    const icon = btn.querySelector('i');
    const isBookmarked = icon.classList.contains('fa-solid');

    // Optimistic UI
    if (isBookmarked) {
        icon.classList.remove('fa-solid');
        icon.classList.add('fa-regular');
        btn.style.color = '';
    } else {
        icon.classList.remove('fa-regular');
        icon.classList.add('fa-solid');
        btn.style.color = 'var(--primary-color)';
    }

    // Add pop animation effect
    icon.classList.add('pop-active');
    icon.addEventListener('animationend', () => {
        icon.classList.remove('pop-active');
    }, { once: true });

    try {
        const res = await fetch(`/api/posts/${postId}/bookmark`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            showToast(data.message, 'success');
        }
    } catch (err) {
        console.error('Bookmark error:', err);
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = message;
    toast.className = 'toast ' + type;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// Unified Confirmation Modal for Logout
function showUnifiedLogoutConfirm(title, message, onConfirm) {
    const oldPopup = document.getElementById('unified-confirm-popup');
    if (oldPopup) oldPopup.remove();

    const popupHtml = `
        <div id="unified-confirm-popup" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 999999;">
            <div style="background: var(--card-bg, var(--surface-bg, #ffffff)); border-radius: 8px; padding: 25px; min-width: 350px; max-width: 450px; text-align: center; box-shadow: var(--card-shadow, 0 10px 25px rgba(0,0,0,0.15)); color: var(--text-color, var(--text-primary, #212121)); border: 1px solid var(--border-color, #dbdbdb); border-top: 4px solid #10b981;">
                <i class="fa-solid fa-circle-question" style="font-size: 45px; color: #10b981; margin-bottom: 20px;"></i>
                <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700;">${title}</h3>
                <p style="margin: 0 0 25px 0; font-size: 15px; color: var(--text-muted, var(--text-secondary, #666)); line-height: 1.5;">${message}</p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="unified-confirm-no" style="background: var(--bg-color, var(--bg-main, #f5f5f5)); color: var(--text-color, var(--text-primary, #212121)); border: 1px solid var(--border-color, #dbdbdb); padding: 10px 25px; border-radius: 6px; font-weight: 600; cursor: pointer; flex: 1; transition: all 0.2s;">Hủy bỏ</button>
                    <button id="unified-confirm-yes" style="background: #10b981; color: #fff; border: none; padding: 10px 25px; border-radius: 6px; font-weight: 600; cursor: pointer; flex: 1; transition: all 0.2s;">Xác nhận</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHtml);

    const yesBtn = document.getElementById('unified-confirm-yes');
    const noBtn = document.getElementById('unified-confirm-no');
    
    yesBtn.onmouseover = () => { yesBtn.style.opacity = '0.9'; };
    yesBtn.onmouseout = () => { yesBtn.style.opacity = '1'; };
    
    noBtn.onmouseover = () => { noBtn.style.background = '#e8e8e8'; };
    noBtn.onmouseout = () => { noBtn.style.background = 'var(--bg-color, var(--bg-main, #f5f5f5))'; };

    document.getElementById('unified-confirm-yes').onclick = () => {
        document.getElementById('unified-confirm-popup').remove();
        if (onConfirm) onConfirm();
    };
    document.getElementById('unified-confirm-no').onclick = () => {
        document.getElementById('unified-confirm-popup').remove();
    };
}

window.logout = function () {
    showUnifiedLogoutConfirm(
        'Xác nhận đăng xuất',
        'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?',
        () => {
            localStorage.removeItem('token');
            window.location.href = '/';
        }
    );
};

window.disbandCommunity = function() {
    // Set default value for radio
    const radios = document.getElementsByName('disband-keep-posts');
    if (radios.length > 0) radios[0].checked = true;
    document.getElementById('disband-community-modal').style.display = 'flex';
};

window.closeDisbandCommunityModal = function() {
    document.getElementById('disband-community-modal').style.display = 'none';
};

window.submitDisbandCommunity = async function() {
    const keepPostsRadios = document.getElementsByName('disband-keep-posts');
    let keepPosts = false;
    for (let r of keepPostsRadios) {
        if (r.checked) {
            keepPosts = r.value === 'true';
            break;
        }
    }
    
    closeDisbandCommunityModal();
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}?keepPosts=${keepPosts}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Đã giải tán cộng đồng thành công", "success");
            setTimeout(() => {
                window.location.href = '/html/communities.html';
            }, 1500);
        } else {
            showToast(await res.text(), "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
    }
};

window.resolveGroupReport = async function(reportId, status, action = '') {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/reports/${reportId}/status?status=${status}&action=${action}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast(status === 'RESOLVED' ? "Đã gỡ bài viết vi phạm" : "Đã bỏ qua báo cáo", "success");
            fetchCommunityReports();
        } else {
            showToast(await res.text(), "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
    }
};

window.openEditCommunityModal = function() {
    if (!window.currentCommunity) return;
    
    document.getElementById('edit-community-name').value = window.currentCommunity.name || '';
    document.getElementById('edit-community-desc').value = window.currentCommunity.description || '';
    document.getElementById('edit-community-privacy').value = window.currentCommunity.isPrivate ? 'PRIVATE' : 'PUBLIC';
    document.getElementById('edit-community-member-approval').value = window.currentCommunity.requireApproval ? 'MANUAL' : 'AUTO';
    document.getElementById('edit-community-post-approval').value = window.currentCommunity.requirePostApproval ? 'MANUAL' : 'AUTO';
    
    // Preview image init
    const coverImg = document.getElementById('edit-cover-preview-img');
    const coverPlaceholder = document.getElementById('edit-cover-placeholder');
    if (window.currentCommunity.coverUrl) {
        coverImg.src = window.currentCommunity.coverUrl;
        coverImg.style.display = 'block';
        coverPlaceholder.style.display = 'none';
        document.getElementById('edit-uploaded-cover-url').value = window.currentCommunity.coverUrl;
    } else {
        coverImg.style.display = 'none';
        coverPlaceholder.style.display = 'block';
        document.getElementById('edit-uploaded-cover-url').value = '';
    }

    const avatarImg = document.getElementById('edit-avatar-preview-img');
    const avatarPlaceholder = document.getElementById('edit-avatar-placeholder');
    if (window.currentCommunity.avatarUrl) {
        avatarImg.src = window.currentCommunity.avatarUrl;
        avatarImg.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
        document.getElementById('edit-uploaded-avatar-url').value = window.currentCommunity.avatarUrl;
    } else {
        avatarImg.style.display = 'none';
        avatarPlaceholder.style.display = 'block';
        document.getElementById('edit-uploaded-avatar-url').value = '';
    }

    document.getElementById('edit-community-modal').style.display = 'flex';
};

window.closeEditCommunityModal = function() {
    document.getElementById('edit-community-modal').style.display = 'none';
};

window.previewEditCommunityCover = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const placeholder = document.getElementById('edit-cover-placeholder');
    const img = document.getElementById('edit-cover-preview-img');
    
    placeholder.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i><div style="font-size: 13px; margin-top: 5px;">Đang tải...</div>';
    
    try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload/image', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        
        document.getElementById('edit-uploaded-cover-url').value = data.url;
        img.src = data.url;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    } catch (e) {
        showToast("Lỗi tải ảnh lên", "error");
        placeholder.innerHTML = '<i class="fa-solid fa-camera" style="font-size: 24px; margin-bottom: 5px;"></i><div style="font-size: 13px;">Tải ảnh bìa mới</div>';
    }
};

window.previewEditCommunityAvatar = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const placeholder = document.getElementById('edit-avatar-placeholder');
    const img = document.getElementById('edit-avatar-preview-img');
    
    placeholder.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i>';
    
    try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload/image', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        
        document.getElementById('edit-uploaded-avatar-url').value = data.url;
        img.src = data.url;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    } catch (e) {
        showToast("Lỗi tải ảnh lên", "error");
        placeholder.innerHTML = '<i class="fa-solid fa-users" style="font-size: 28px;"></i>';
    }
};

window.submitEditCommunity = async function() {
    const name = document.getElementById('edit-community-name').value.trim();
    const desc = document.getElementById('edit-community-desc').value.trim();
    const privacy = document.getElementById('edit-community-privacy').value;
    const coverUrl = document.getElementById('edit-uploaded-cover-url').value;
    const avatarUrl = document.getElementById('edit-uploaded-avatar-url').value;

    if (!name) {
        showToast("Vui lòng nhập tên cộng đồng", "error");
        return;
    }

    const btnSubmit = document.getElementById('btn-edit-community-submit');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                description: desc,
                isPrivate: privacy === 'PRIVATE',
                requireApproval: document.getElementById('edit-community-member-approval').value === 'MANUAL',
                requirePostApproval: document.getElementById('edit-community-post-approval').value === 'MANUAL',
                avatarUrl: avatarUrl,
                coverUrl: coverUrl
            })
        });

        if (res.ok) {
            showToast("Cập nhật thông tin thành công!", "success");
            closeEditCommunityModal();
            location.reload();
        } else {
            const err = await res.text();
            showToast(err || "Lỗi khi cập nhật cộng đồng", "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
        console.error(e);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = 'Lưu thay đổi';
    }
};

window.changeMemberRole = function(userId, role) {
    const title = role === 'ADMIN' ? 'Bổ nhiệm Phó nhóm' : 'Bãi nhiệm Phó nhóm';
    const message = role === 'ADMIN' 
        ? 'Bạn có chắc chắn muốn bổ nhiệm thành viên này làm Phó nhóm không?' 
        : 'Bạn có chắc chắn muốn bãi nhiệm vai trò Phó nhóm của thành viên này không?';

    showConfirmModal(title, message, async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/communities/${window.currentCommunityId}/members/${userId}/role?role=${role}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast("Đã cập nhật vai trò thành công", "success");
                fetchManageMembers('active');
            } else {
                showToast(await res.text(), "error");
            }
        } catch (e) {
            showToast("Lỗi kết nối", "error");
        }
    });
};

window.doBanMember = function(userId) {
    document.getElementById('ban-user-id-input').value = userId;
    const radios = document.getElementsByName('ban-duration');
    if (radios.length > 0) radios[0].checked = true;
    document.getElementById('ban-member-modal').style.display = 'flex';
};

window.closeBanMemberModal = function() {
    document.getElementById('ban-member-modal').style.display = 'none';
};

window.submitBanMember = async function() {
    const userId = document.getElementById('ban-user-id-input').value;
    const durationRadios = document.getElementsByName('ban-duration');
    let duration = 1;
    for (let r of durationRadios) {
        if (r.checked) {
            duration = parseInt(r.value, 10);
            break;
        }
    }
    
    closeBanMemberModal();
    
    const token = localStorage.getItem('token');
    try {
        let url = `/api/communities/${window.currentCommunityId}/ban/${userId}`;
        if (duration > 0) {
            url += `?duration=${duration}`;
        }
        
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Đã chặn thành viên thành công", "success");
            fetchManageMembers('active');
            updateAllManageCounts();
            fetchMemberCount(token, window.currentCommunityId);
        } else {
            showToast(await res.text(), "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
    }
};

window.doUnbanMember = function(userId) {
    showConfirmModal(
        'Mở chặn thành viên',
        'Bạn có chắc chắn muốn mở chặn cho người dùng này không?',
        async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`/api/communities/${window.currentCommunityId}/unban/${userId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    showToast("Đã bỏ chặn thành công", "success");
                    fetchManageMembers('blocked');
                } else {
                    showToast(await res.text(), "error");
                }
            } catch (e) {
                showToast("Lỗi kết nối", "error");
            }
        }
    );
};

async function updateAllManageCounts() {
    const token = localStorage.getItem('token');
    const communityId = window.currentCommunityId;
    if (!communityId) return;

    // Fetch pending members count
    try {
        const res = await fetch(`/api/communities/${communityId}/members?status=PENDING`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const list = await res.json();
            const el = document.getElementById('count-pending');
            if (el) el.textContent = list.length;
        }
    } catch(e) {}

    // Fetch active members count
    try {
        const res = await fetch(`/api/communities/${communityId}/members?status=ACTIVE`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const list = await res.json();
            const el = document.getElementById('count-active');
            if (el) el.textContent = list.length;
        }
    } catch(e) {}

    // Fetch reports count
    try {
        const res = await fetch(`/api/communities/${communityId}/reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const list = await res.json();
            const el = document.getElementById('count-reports');
            if (el) el.textContent = list.length;
        }
    } catch(e) {}

    // Fetch blocked members count
    try {
        const res = await fetch(`/api/communities/${communityId}/members?status=BLOCKED`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const list = await res.json();
            const el = document.getElementById('count-blocked');
            if (el) el.textContent = list.length;
        }
    } catch(e) {}

    // Fetch pending posts count
    try {
        const res = await fetch(`/api/communities/${communityId}/pending-posts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const list = await res.json();
            const el = document.getElementById('count-pending-posts');
            if (el) el.textContent = list.length;
        }
    } catch(e) {}

    // Fetch rules count
    try {
        const res = await fetch(`/api/communities/${communityId}/rules`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const list = await res.json();
            const el = document.getElementById('count-rules');
            if (el) el.textContent = list.length;
        }
    } catch(e) {}
}

async function fetchPendingPosts() {
    const container = document.getElementById('manage-list-posts');
    if (!container) return;
    
    container.innerHTML = Array(2).fill(0).map(() => `
        <div class="card skeleton-post" style="padding: 16px; margin-bottom: 16px; border-radius: 8px;">
            <div class="skeleton-header" style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
                <div class="skeleton-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out;"></div>
                <div class="skeleton-meta" style="flex: 1;">
                    <div class="skeleton-line" style="height: 12px; width: 30%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; margin-bottom: 6px; border-radius: 4px;"></div>
                    <div class="skeleton-line" style="height: 10px; width: 15%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; border-radius: 4px;"></div>
                </div>
            </div>
            <div class="skeleton-content">
                <div class="skeleton-line" style="height: 14px; width: 90%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; margin-bottom: 8px; border-radius: 4px;"></div>
                <div class="skeleton-line" style="height: 14px; width: 75%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; border-radius: 4px;"></div>
            </div>
        </div>
    `).join('');
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/pending-posts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const posts = await res.json();
            const countEl = document.getElementById('count-pending-posts');
            if (countEl) countEl.textContent = posts.length;
            
            if (posts.length === 0) {
                container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fa-solid fa-check-circle" style="font-size: 36px; margin-bottom: 10px; display: block; color: #10b981;"></i>
                    Không có bài đăng nào cần duyệt.
                </div>`;
                return;
            }
            
            container.innerHTML = posts.map(p => {
                const avatar = p.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.authorName || 'User')}&background=5e6ad2&color=fff`;
                
                let mediaHtml = '';
                if (p.imageUrl) {
                    mediaHtml = `<div style="margin-top: 10px;"><img src="${p.imageUrl}" style="max-width: 200px; max-height: 150px; border-radius: 8px; object-fit: cover; cursor: pointer;" onclick="window.open('${p.imageUrl}')"></div>`;
                } else if (p.videoUrl) {
                    mediaHtml = `<div style="margin-top: 10px;"><video src="${p.videoUrl}" controls style="max-width: 200px; max-height: 150px; border-radius: 8px; object-fit: cover;"></video></div>`;
                }

                return `
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: flex-start; gap: 12px; flex: 1;">
                            <img src="${avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: var(--text-main); margin-bottom: 4px;">${p.authorName || 'Người dùng'}</div>
                                <div style="font-size: 13px; color: var(--text-main); margin-bottom: 6px; white-space: pre-wrap;">${escapeHtml(p.content || '')}</div>
                                ${mediaHtml}
                                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                                    ${p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : ''}
                                </div>
                                <div style="display: flex; gap: 8px; margin-top: 10px;">
                                    <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; background: var(--primary-color); color: white;" onclick="approvePendingPost(${p.id})">Phê duyệt</button>
                                    <button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; background: #ff4d4f; color: white;" onclick="rejectPendingPost(${p.id})">Từ chối</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Lỗi tải danh sách bài viết.</div>';
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Lỗi kết nối.</div>';
    }
}

window.approvePendingPost = async function(postId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/posts/${postId}/approve`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('Đã phê duyệt bài viết! Hệ thống AI đang tiến hành kiểm duyệt...', 'success');
            fetchPendingPosts();
            updateAllManageCounts();
        } else {
            showToast(await res.text(), 'error');
        }
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
};

window.rejectPendingPost = async function(postId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/posts/${postId}/reject`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('Đã từ chối bài viết.', 'success');
            fetchPendingPosts();
            updateAllManageCounts();
        } else {
            showToast(await res.text(), 'error');
        }
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
};

window.pinPost = async function(postId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/posts/${postId}/pin`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Đã ghim bài viết thành công!", "success");
            location.reload();
        } else {
            showToast(await res.text(), "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
    }
};

window.unpinPost = async function(postId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/posts/${postId}/unpin`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Đã bỏ ghim bài viết thành công!", "success");
            location.reload();
        } else {
            showToast(await res.text(), "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
    }
};

async function loadPinnedPosts(token, id) {
    const container = document.getElementById('pinned-posts-container');
    const listContainer = document.getElementById('pinned-posts-list');
    if (!container || !listContainer) return;
    
    try {
        const res = await fetch(`/api/communities/${id}/pinned-posts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const posts = await res.json();
            if (posts.length === 0) {
                container.style.display = 'none';
                return;
            }
            
            container.style.display = 'block';
            listContainer.innerHTML = posts.map(post => {
                const isMine = post.authorId === window.currentUser.id;
                const isManager = window.isCurrentCommunityManager;
                
                let optionsHtml = '';
                if (isMine || isManager) {
                    optionsHtml = `
                    <div class="post-options" style="position: absolute; top: 15px; right: 15px; z-index: 10;">
                        <button class="options-btn" onclick="toggleDropdown('pinned-' + ${post.id})" style="background: none; border: none; font-size: 16px; color: var(--text-muted); cursor: pointer; padding: 5px;">
                            <i class="fa-solid fa-ellipsis"></i>
                          </button>
                          <div id="dropdown-pinned-${post.id}" class="dropdown-content" style="display: none; position: absolute; right: 0; top: 25px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); width: 180px; z-index: 100;">
                              ${isMine ? `
                                  <a href="javascript:void(0)" onclick="deletePost(${post.id})" style="color: var(--red-icon); display: flex; align-items: center; gap: 8px; padding: 8px 12px; text-decoration: none; font-size: 13px; font-weight: 600;"><i class="fa-regular fa-trash-can"></i> Xóa bài viết</a>
                              ` : `
                                  <a href="javascript:void(0)" onclick="deletePost(${post.id})" style="color: var(--red-icon); display: flex; align-items: center; gap: 8px; padding: 8px 12px; text-decoration: none; font-size: 13px; font-weight: 600;"><i class="fa-regular fa-trash-can"></i> Gỡ bài (BQT)</a>
                              `}
                              ${isManager ? `
                                  <div style="height: 1px; background: var(--border-color); margin: 4px 0;"></div>
                                  <a href="javascript:void(0)" onclick="unpinPost(${post.id})" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; text-decoration: none; color: var(--text-main); font-size: 13px; font-weight: 600;"><i class="fa-solid fa-thumbtack" style="transform: rotate(45deg); color: var(--primary-color);"></i> Bỏ ghim bài viết</a>
                              ` : ''}
                          </div>
                      </div>
                      `;
                  }
                  
                  let mediaHtml = '';
                  if (post.imageUrl) {
                      mediaHtml = `<div class="post-image-placeholder text-center" style="margin-top: 10px;"><img src="${post.imageUrl}" style="max-width: 100%; border-radius: 8px; max-height: 200px; object-fit: contain;"></div>`;
                  } else if (post.videoUrl) {
                      mediaHtml = `<div class="post-video-placeholder text-center" style="margin-top: 10px;"><video src="${post.videoUrl}" controls style="max-width: 100%; border-radius: 8px; max-height: 200px; background: #000;"></video></div>`;
                  }
                  
                  return `
                      <div class="pinned-post-item" id="pinned-post-${post.id}" style="position: relative; padding: 12px 15px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-main);">
                          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                              <img src="${post.authorAvatar || '/uploads/default-avatar.png'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                              <div>
                                  <div style="font-weight: 600; font-size: 13px; color: var(--text-main);">${escapeHtml(post.authorName)}</div>
                                  <div style="font-size: 11px; color: var(--text-muted);">${timeSince(post.createdAt)}</div>
                              </div>
                          </div>
                          ${optionsHtml}
                          <div style="font-size: 13px; color: var(--text-main); line-height: 1.4; white-space: pre-wrap;">${escapeHtml(post.content || '')}</div>
                          ${mediaHtml}
                      </div>
                  `;
              }).join('');
          }
      } catch (e) {
          console.error("Lỗi khi tải bài viết ghim", e);
      }
  }

window.deletePost = function(postId) {
    showConfirmModal(
        'Xác nhận xóa bài viết',
        'Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.',
        async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`/api/posts/${postId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    showToast("Đã xóa bài viết thành công", "success");
                    const el = document.getElementById('post-' + postId);
                    const pinnedEl = document.getElementById('pinned-post-' + postId);
                    if (el) el.remove();
                    if (pinnedEl) pinnedEl.remove();
                    
                    // Hide pinned posts section if empty now
                    const listContainer = document.getElementById('pinned-posts-list');
                    if (listContainer && listContainer.children.length === 0) {
                        const container = document.getElementById('pinned-posts-container');
                        if (container) container.style.display = 'none';
                    }
                } else {
                    showToast(await res.text(), "error");
                }
            } catch (e) {
                showToast("Lỗi kết nối", "error");
            }
        }
    );
};

window.reportPostInGroup = async function(postId) {
    const reason = prompt("Nhập lý do báo cáo bài viết:");
    if (!reason || !reason.trim()) return;
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/posts/${postId}/report`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reason: reason.trim(),
                category: 'OTHER'
            })
        });
        if (res.ok) {
            showToast("Đã gửi báo cáo bài viết thành công", "success");
        } else {
            showToast(await res.text(), "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
    }
};

window.communityRules = [];

async function fetchCommunityRulesManage() {
    const container = document.getElementById('rules-list-container');
    if (!container) return;
    
    container.innerHTML = Array(3).fill(0).map(() => `
        <div style="padding: 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
                <div class="skeleton-line" style="height: 14px; width: 30%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; margin-bottom: 8px; border-radius: 4px;"></div>
                <div class="skeleton-line" style="height: 11px; width: 60%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; border-radius: 4px;"></div>
            </div>
            <div class="skeleton-line" style="height: 32px; width: 60px; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; border-radius: 6px;"></div>
        </div>
    `).join('');
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/rules`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            window.communityRules = await res.json();
            renderCommunityRulesManage();
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Lỗi tải danh sách quy tắc.</div>';
        }
    } catch (e) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Lỗi kết nối.</div>';
    }
}

function renderCommunityRulesManage() {
    const container = document.getElementById('rules-list-container');
    if (!container) return;
    
    if (window.communityRules.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted);">
            <i class="fa-solid fa-gavel" style="font-size: 36px; margin-bottom: 10px; display: block; color: var(--text-muted);"></i>
            Cộng đồng chưa thiết lập quy tắc nào.
        </div>`;
        return;
    }
    
    container.innerHTML = window.communityRules.map((r, index) => `
        <div style="display: flex; align-items: flex-start; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid var(--border-color);">
            <div style="flex: 1; min-width: 0; padding-right: 15px;">
                <div style="font-weight: 700; font-size: 15px; color: var(--text-main); margin-bottom: 6px;">${index + 1}. ${escapeHtml(r.title)}</div>
                <div style="font-size: 13px; color: var(--text-muted); line-height: 1.5;">${escapeHtml(r.description)}</div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary" onclick="openRuleModal(${index})" style="padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600;"><i class="fa-solid fa-pen"></i> Sửa</button>
                <button class="btn btn-danger" onclick="deleteRule(${index})" style="padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600; background: #ff4d4f; border: none; color: white;"><i class="fa-solid fa-trash-can"></i> Xóa</button>
            </div>
        </div>
    `).join('');
}

window.openRuleModal = function(index = -1) {
    if (index === -1 && window.communityRules.length >= 10) {
        showToast("Chỉ cấu hình tối đa 10 quy tắc nhóm.", "error");
        return;
    }
    
    document.getElementById('rule-id-input').value = index;
    if (index >= 0) {
        const rule = window.communityRules[index];
        document.getElementById('rule-modal-title').innerText = "Sửa quy tắc nhóm";
        document.getElementById('rule-title-input').value = rule.title;
        document.getElementById('rule-desc-input').value = rule.description;
    } else {
        document.getElementById('rule-modal-title').innerText = "Thêm quy tắc nhóm";
        document.getElementById('rule-title-input').value = "";
        document.getElementById('rule-desc-input').value = "";
    }
    
    document.getElementById('rule-modal').style.display = 'flex';
};

window.closeRuleModal = function() {
    document.getElementById('rule-modal').style.display = 'none';
};

window.saveRule = async function() {
    const index = parseInt(document.getElementById('rule-id-input').value, 10);
    const title = document.getElementById('rule-title-input').value.trim();
    const desc = document.getElementById('rule-desc-input').value.trim();
    
    if (!title || !desc) {
        showToast("Vui lòng điền đầy đủ tiêu đề và mô tả quy tắc", "error");
        return;
    }
    
    closeRuleModal();
    
    if (index >= 0) {
        window.communityRules[index].title = title;
        window.communityRules[index].description = desc;
    } else {
        window.communityRules.push({
            title: title,
            description: desc
        });
    }
    
    await submitRulesUpdate();
};

window.deleteRule = function(index) {
    showConfirmModal(
        'Xác nhận xóa quy tắc',
        'Bạn có chắc muốn xóa quy tắc này khỏi danh sách cộng đồng?',
        async () => {
            window.communityRules.splice(index, 1);
            await submitRulesUpdate();
        }
    );
};

async function submitRulesUpdate() {
    const token = localStorage.getItem('token');
    const btnSave = document.getElementById('btn-save-rule');
    if (btnSave) btnSave.disabled = true;
    
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/rules`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(window.communityRules.map(r => ({ title: r.title, description: r.description })))
        });
        if (res.ok) {
            showToast("Đã lưu quy tắc nhóm thành công!", "success");
            fetchCommunityRulesManage();
            updateAllManageCounts();
        } else {
            showToast(await res.text(), "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
    } finally {
        if (btnSave) btnSave.disabled = false;
    }
}

window.currentLogsPage = 0;
window.logsPageSize = 10;
window.logsTotalPages = 1;

async function fetchCommunityLogs() {
    const container = document.getElementById('logs-list-container');
    if (!container) return;
    
    container.innerHTML = Array(4).fill(0).map(() => `
        <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
            <div style="flex: 1;">
                <div class="skeleton-line" style="height: 12px; width: 60%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; margin-bottom: 6px; border-radius: 4px;"></div>
                <div class="skeleton-line" style="height: 10px; width: 30%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; border-radius: 4px;"></div>
            </div>
        </div>
    `).join('');
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/logs?page=${window.currentLogsPage}&size=${window.logsPageSize}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const logs = data.content || [];
            window.logsTotalPages = data.totalPages || 1;
            
            // Update page info display
            const pageInfo = document.getElementById('logs-page-info');
            const prevBtn = document.getElementById('btn-logs-prev');
            const nextBtn = document.getElementById('btn-logs-next');
            if (pageInfo) pageInfo.textContent = `Trang ${window.currentLogsPage + 1} / ${window.logsTotalPages}`;
            if (prevBtn) prevBtn.disabled = window.currentLogsPage === 0;
            if (nextBtn) nextBtn.disabled = window.currentLogsPage >= window.logsTotalPages - 1;

            if (logs.length === 0) {
                container.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--text-muted);">
                    <i class="fa-solid fa-clock-rotate-left" style="font-size: 36px; margin-bottom: 10px; display: block; color: var(--text-muted);"></i>
                    Nhật ký hoạt động trống.
                </div>`;
                return;
            }
            
            container.innerHTML = logs.map(l => {
                const logTime = l.createdAt ? new Date(l.createdAt).toLocaleString('vi-VN') : '';
                return `
                    <div style="padding: 12px 0; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                        <div style="flex: 1; min-width: 0; padding-right: 15px; color: var(--text-main);">
                            <span style="font-weight: 600;">${escapeHtml(l.adminName)}</span>
                            <span style="margin-left: 5px;">${escapeHtml(l.action)}</span>
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); white-space: nowrap;">${logTime}</div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Lỗi tải nhật ký hoạt động.</div>';
        }
    } catch (e) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Lỗi kết nối.</div>';
    }
}

window.changeLogsPage = function(delta) {
    const newPage = window.currentLogsPage + delta;
    if (newPage >= 0 && newPage < window.logsTotalPages) {
        window.currentLogsPage = newPage;
        fetchCommunityLogs();
    }
};

window.exportCommunityLogs = function(format) {
    const token = localStorage.getItem('token');
    fetch(`/api/communities/${window.currentCommunityId}/logs/export?format=${format}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(async res => {
        if (!res.ok) {
            throw new Error(await res.text() || "Không thể tải báo cáo");
        }
        return res.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nhat_ky_hoat_dong_${window.currentCommunityId}.${format === 'csv' ? 'csv' : 'json'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showToast("Tải báo cáo nhật ký thành công!", "success");
    })
    .catch(err => {
        showToast(err.message || "Lỗi tải báo cáo", "error");
    });
};

let postsChartInstance = null;
let membersChartInstance = null;

async function loadCommunityAnalytics() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            
            // Populate cards
            document.getElementById('stat-new-members').textContent = data.newMembersThisWeek || 0;
            document.getElementById('stat-new-posts').textContent = data.newPostsThisWeek || 0;
            document.getElementById('stat-new-reports').textContent = data.newReportsThisWeek || 0;
            
            const dailyTrends = data.dailyTrends || [];
            const labels = dailyTrends.map(t => {
                const date = new Date(t.date);
                return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            });
            const postsData = dailyTrends.map(t => t.newPosts || 0);
            const membersData = dailyTrends.map(t => t.newMembers || 0);
            
            // Destroy existing charts if any
            if (postsChartInstance) postsChartInstance.destroy();
            if (membersChartInstance) membersChartInstance.destroy();
            
            // Render posts line chart
            const ctxPosts = document.getElementById('posts-trend-chart').getContext('2d');
            postsChartInstance = new Chart(ctxPosts, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Bài đăng mới',
                        data: postsData,
                        borderColor: '#5e6ad2',
                        backgroundColor: 'rgba(94, 106, 210, 0.15)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1, precision: 0 }
                        }
                    }
                }
            });
            
            // Render members bar chart
            const ctxMembers = document.getElementById('members-trend-chart').getContext('2d');
            membersChartInstance = new Chart(ctxMembers, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Thành viên mới',
                        data: membersData,
                        backgroundColor: '#10b981',
                        borderRadius: 6,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1, precision: 0 }
                        }
                    }
                }
            });
        }
    } catch(e) {
        console.error("Lỗi tải thống kê", e);
    }
}

window.communityTags = [];
window.selectedFilterTag = '';

window.loadCommunityTags = async function() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/tags`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const tags = await res.json();
            window.communityTags = tags;
            
            // 1. Populate search filter chips
            const filterContainer = document.getElementById('community-tag-chips-container');
            if (filterContainer) {
                let activeStyle = window.selectedFilterTag === '' ? 'background: var(--primary-color); color: white; border: 1px solid var(--primary-color);' : 'background: var(--bg-main); color: var(--text-secondary); border: 1px solid var(--border-color);';
                let html = `<span class="tag-chip ${window.selectedFilterTag === '' ? 'active' : ''}" onclick="filterByTag('')" style="cursor: pointer; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 550; ${activeStyle} transition: all 0.2s ease;">Tất cả</span>`;
                
                tags.forEach(tag => {
                    let isAct = window.selectedFilterTag === tag;
                    let style = isAct ? 'background: var(--primary-color); color: white; border: 1px solid var(--primary-color);' : 'background: var(--bg-main); color: var(--text-secondary); border: 1px solid var(--border-color);';
                    html += `<span class="tag-chip ${isAct ? 'active' : ''}" onclick="filterByTag('${tag}')" style="cursor: pointer; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 550; ${style} transition: all 0.2s ease;">#${escapeHtml(tag)}</span>`;
                });
                filterContainer.innerHTML = html;
            }

            // Show or hide search card
            const searchCard = document.getElementById('community-search-filter-card');
            if (searchCard) {
                if (window.isCurrentCommunityManager || window.currentCommunity.membershipStatus === 'ACTIVE' || !window.currentCommunity.isPrivate) {
                    searchCard.style.display = 'flex';
                } else {
                    searchCard.style.display = 'none';
                }
            }

            // 2. Populate create post tag checklist/chips selector
            const createPostTagsContainer = document.getElementById('modal-post-tags-container');
            const createPostTagsSection = document.getElementById('modal-post-tags-section');
            if (createPostTagsContainer && createPostTagsSection) {
                if (tags.length > 0) {
                    createPostTagsSection.style.display = 'block';
                    createPostTagsContainer.innerHTML = tags.map(tag => `
                        <label style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-main); font-size: 13px; font-weight: 550; color: var(--text-main); cursor: pointer; transition: all 0.2s;">
                            <input type="checkbox" value="${escapeHtml(tag)}" style="cursor: pointer;">
                            #${escapeHtml(tag)}
                        </label>
                    `).join('');
                } else {
                    createPostTagsSection.style.display = 'none';
                }
            }

            // 3. Populate manage tab tags
            const manageTagsContainer = document.getElementById('tags-list-container');
            const countTagsEl = document.getElementById('count-tags');
            if (countTagsEl) countTagsEl.textContent = tags.length;
            if (manageTagsContainer) {
                if (tags.length === 0) {
                    manageTagsContainer.innerHTML = `<div style="text-align: center; padding: 30px; width: 100%; color: var(--text-muted);">
                        Chưa có tag nào được tạo. Quản trị viên có thể tạo tối đa 15 tag để quản lý chủ đề bài viết.
                    </div>`;
                } else {
                    manageTagsContainer.innerHTML = tags.map(tag => `
                        <span style="display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 20px; background: var(--primary-light); color: var(--primary-color); font-weight: 600; font-size: 13px; border: 1px solid rgba(94,106,210,0.15);">
                            #${escapeHtml(tag)}
                            <i class="fa-solid fa-xmark" style="cursor: pointer; font-size: 14px; margin-left: 2px;" onclick="deleteCommunityTag('${escapeHtml(tag)}')"></i>
                        </span>
                    `).join('');
                }
            }
        }
    } catch (e) {
        console.error("Lỗi tải tags", e);
    }
};

window.handleCommunityPostSearch = function(event) {
    if (event.key === 'Enter') {
        const searchVal = event.target.value.trim();
        const token = localStorage.getItem('token');
        loadCommunityPosts(token, window.currentCommunityId, searchVal, window.selectedFilterTag);
    }
};

window.filterByTag = function(tag) {
    window.selectedFilterTag = tag;
    const token = localStorage.getItem('token');
    const searchVal = document.getElementById('community-post-search-input').value.trim();
    
    const chips = document.querySelectorAll('#community-tag-chips-container .tag-chip');
    chips.forEach(chip => {
        const isAllChip = chip.textContent === 'Tất cả' && tag === '';
        const isMatchingTag = chip.textContent === '#' + tag;
        if (isAllChip || isMatchingTag) {
            chip.classList.add('active');
            chip.style.cssText = "cursor: pointer; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 550; background: var(--primary-color); color: white; border: 1px solid var(--primary-color); transition: all 0.2s ease;";
        } else {
            chip.classList.remove('active');
            chip.style.cssText = "cursor: pointer; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 550; background: var(--bg-main); color: var(--text-secondary); border: 1px solid var(--border-color); transition: all 0.2s ease;";
        }
    });

    loadCommunityPosts(token, window.currentCommunityId, searchVal, tag);
};

window.createCommunityTag = async function() {
    const input = document.getElementById('new-tag-name-input');
    const tagName = input.value.trim().replace(/^#/, '');
    if (!tagName) {
        showToast("Vui lòng nhập tên tag", "error");
        return;
    }
    
    if (window.communityTags.includes(tagName)) {
        showToast("Tag này đã tồn tại", "error");
        return;
    }
    
    if (window.communityTags.length >= 15) {
        showToast("Đã đạt giới hạn tối đa 15 tag", "error");
        return;
    }

    const updatedTags = [...window.communityTags, tagName];
    await submitTagsUpdate(updatedTags);
    input.value = '';
};

window.deleteCommunityTag = async function(tagName) {
    showConfirmModal(
        'Xác nhận xóa Tag',
        `Bạn có chắc muốn xóa tag #${tagName}? Bài viết chứa tag này sẽ không bị xóa nhưng sẽ không còn gắn tag nữa.`,
        async () => {
            const updatedTags = window.communityTags.filter(t => t !== tagName);
            await submitTagsUpdate(updatedTags);
        }
    );
};

async function submitTagsUpdate(tagsList) {
    const token = localStorage.getItem('token');
    const btn = document.getElementById('btn-add-tag');
    if (btn) btn.disabled = true;
    
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/tags`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tagsList)
        });
        if (res.ok) {
            showToast("Đã cập nhật danh sách tag thành công!", "success");
            await window.loadCommunityTags();
        } else {
            showToast(await res.text(), "error");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
    } finally {
        if (btn) btn.disabled = false;
    }
}

window.allFriendsList = [];

window.openInviteFriendsModal = async function() {
    document.getElementById('invite-friends-modal').style.display = 'flex';
    document.getElementById('invite-friends-search').value = '';
    const listContainer = document.getElementById('invite-friends-list');
    listContainer.innerHTML = Array(3).fill(0).map(() => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <div class="skeleton-avatar" style="width: 32px; height: 32px; border-radius: 50%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; flex-shrink: 0;"></div>
                <div class="skeleton-line" style="height: 12px; width: 45%; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; border-radius: 4px;"></div>
            </div>
            <div class="skeleton-line" style="height: 28px; width: 60px; background: var(--skeleton-bg); animation: skeleton-pulse 1.5s infinite ease-in-out; border-radius: 6px;"></div>
        </div>
    `).join('');
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/friends', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const friends = await res.json();
            const membersRes = await fetch(`/api/communities/${window.currentCommunityId}/members`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            let existingMemberIds = [];
            if (membersRes.ok) {
                const members = await membersRes.json();
                existingMemberIds = members.map(m => m.id || m.userId || (m.user && m.user.id));
            }
            
            window.allFriendsList = friends.filter(f => !existingMemberIds.includes(f.id));
            renderFriendsToInvite(window.allFriendsList);
        } else {
            listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Lỗi tải danh sách bạn bè.</div>';
        }
    } catch (e) {
        console.error(e);
        listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">Lỗi kết nối.</div>';
    }
};

window.closeInviteFriendsModal = function() {
    document.getElementById('invite-friends-modal').style.display = 'none';
};

function renderFriendsToInvite(list) {
    const listContainer = document.getElementById('invite-friends-list');
    if (list.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">Không có bạn bè nào để mời.</div>';
        return;
    }
    
    listContainer.innerHTML = list.map(friend => {
        const avatarUrl = friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName)}&background=5e6ad2&color=fff`;
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${avatarUrl}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(friend.fullName)}&background=5e6ad2&color=fff'">
                    <span style="font-weight: 600; font-size: 13.5px; color: var(--text-main);">${escapeHtml(friend.fullName)}</span>
                </div>
                <button class="btn btn-primary" id="btn-invite-${friend.id}" onclick="inviteFriendToCommunity(${friend.id})" style="padding: 6px 12px; font-size: 12.5px; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; background: var(--primary-color); color: white;">Mời</button>
            </div>
        `;
    }).join('');
}

window.filterFriendsToInvite = function(keyword) {
    const kw = keyword.toLowerCase().trim();
    const filtered = window.allFriendsList.filter(f => f.fullName && f.fullName.toLowerCase().includes(kw));
    renderFriendsToInvite(filtered);
};

window.inviteFriendToCommunity = async function(friendId) {
    const btn = document.getElementById(`btn-invite-${friendId}`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    }
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/communities/${window.currentCommunityId}/invite/${friendId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Đã gửi lời mời tham gia nhóm!", "success");
            if (btn) {
                btn.className = "btn btn-secondary";
                btn.style.background = "var(--button-bg)";
                btn.style.color = "var(--text-muted)";
                btn.style.border = "1px solid var(--border-color)";
                btn.textContent = "Đã mời";
            }
        } else {
            showToast(await res.text(), "error");
            if (btn) {
                btn.disabled = false;
                btn.textContent = "Mời";
            }
        }
    } catch (e) {
        showToast("Lỗi kết nối", "error");
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Mời";
        }
    }
};

window.toggleDropdown = function(postId) {
    const dropdown = document.getElementById('dropdown-' + postId);
    if (!dropdown) return;
    const isShown = dropdown.style.display === 'block';
    document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');
    dropdown.style.display = isShown ? 'none' : 'block';
};

window.addEventListener('click', (event) => {
    if (!event.target.closest('.options-btn')) {
        document.querySelectorAll('.dropdown-content').forEach(d => {
            d.style.display = 'none';
        });
    }
});

let activeReportPostId = null;
let activeReportCommentId = null;
let activeReportTarget = 'SYSTEM';

window.reportPostToTarget = function(postId, target) {
    activeReportPostId = postId;
    activeReportCommentId = null;
    activeReportTarget = target || 'SYSTEM';
    
    const titleEl = document.getElementById('report-modal-title');
    if (titleEl) {
        if (target === 'COMMUNITY') {
            titleEl.innerText = "Báo cáo với chủ nhóm";
        } else {
            titleEl.innerText = "Báo cáo với quản trị riêng";
        }
    }
    document.getElementById('report-modal').style.display = 'flex';
    document.getElementById('report-reason').value = '';

    // Bind confirm button
    const confirmBtn = document.getElementById('confirm-report-btn');
    if (confirmBtn) {
        confirmBtn.onclick = () => window.submitReport();
    }
};

window.closeReportModal = function() {
    document.getElementById('report-modal').style.display = 'none';
    activeReportPostId = null;
    activeReportCommentId = null;
};

window.submitReport = async function() {
    const token = localStorage.getItem('token');
    const reason = document.getElementById('report-reason').value.trim();
    const category = document.getElementById('report-category').value;

    if (!reason) {
        showToast('Vui lòng nhập lý do báo cáo.', 'error');
        return;
    }

    let endpoint = '';
    if (activeReportPostId) {
        endpoint = `/api/posts/${activeReportPostId}/report`;
    } else if (activeReportCommentId) {
        endpoint = `/api/posts/comments/${activeReportCommentId}/report`;
    }

    const payload = {
        reason: reason,
        category: category,
        reportTarget: activeReportTarget || 'SYSTEM'
    };

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast('Cảm ơn bạn! Báo cáo đã được gửi.', 'success');
            window.closeReportModal();
        } else {
            const err = await res.text();
            showToast(err || 'Gửi báo cáo thất bại.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối mạng.', 'error');
    }
};

window.hidePost = async function(postId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/posts/${postId}/hide`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            document.getElementById('post-' + postId).style.display = 'none';
            showToast('Đã ẩn bài viết vĩnh viễn.', 'info');
        }
    } catch (err) {
        console.error(err);
    }
};

window.joinCommunityFromFeed = async function (event, commId, btn) {
    if (event) event.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`/api/communities/${commId}/join`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('Tham gia cộng đồng thành công!', 'success');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-check" style="margin-right: 3px;"></i>Đã tham gia';
                btn.style.borderColor = '#10b981';
                btn.style.color = '#10b981';
                btn.disabled = true;
                btn.onclick = null;
            }
        } else {
            const errText = await res.text();
            showToast(errText || 'Lỗi khi tham gia cộng đồng.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối mạng.', 'error');
    }
};

window.addFriendFromFeed = async function(event, userId, btn) {
    if (event) event.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch(`/api/friends/request/${userId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('Đã gửi lời mời kết bạn!', 'success');
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-check" style="margin-right: 3px;"></i>Đã gửi';
                btn.style.borderColor = '#10b981';
                btn.style.color = '#10b981';
                btn.disabled = true;
                btn.onclick = null;
            }
        } else {
            const errText = await res.text();
            showToast(errText || 'Lỗi khi gửi lời mời kết bạn.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Lỗi kết nối mạng.', 'error');
    }
};
