(function() {
    // ---------- persistent storage ----------
    let accounts = JSON.parse(localStorage.getItem('funded_accounts')) || [];
    accounts = accounts.map(acc => ({
        ...acc,
        totalProfit: acc.totalProfit || 0,
        totalLoss: acc.totalLoss || 0,
        wins: acc.wins || 0,
        losses: acc.losses || 0,
        deactivated: acc.deactivated || false,
        phase: acc.phase || 'Phase 01'
    }));

    let activeAccountId = localStorage.getItem('activeAccountId') ? parseInt(localStorage.getItem('activeAccountId')) : (accounts[0]?.id || null);
    let editingIndex = -1;
    let notificationTimeout = null;

    // DOM elements
    const modal = document.getElementById('accountModal');
    const modalTitle = document.getElementById('modalTitle');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const openAddAccountBtn = document.getElementById('openAddAccountBtn');
    const saveAccountBtn = document.getElementById('saveAccountBtn');
    const editingIndexInput = document.getElementById('editingIndex');
    const nicknameInput = document.getElementById('nickname');
    const emailInput = document.getElementById('email');
    const phaseSelect = document.getElementById('phaseSelect');
    const classicToggle = document.getElementById('classicToggle');
    const sizeBtns = document.querySelectorAll('.size-btn');
    const ruleDetails = document.getElementById('ruleDetails');
    const accountsContainer = document.getElementById('accountsContainer');
    
    // page1 elements
    const phaseNameDisplay = document.getElementById('phaseNameDisplay');
    const activeAccountLabel = document.getElementById('activeAccountLabel');
    const profitTargetEl = document.getElementById('profitTarget');
    const maxLossEl = document.getElementById('maxLoss');
    const totalProfitEl = document.getElementById('totalProfit');
    const profitRemainingEl = document.getElementById('profitRemaining');
    const lossRemainingEl = document.getElementById('lossRemaining');
    const winLossRateEl = document.getElementById('winLossRate');
    const meterProfit = document.getElementById('meterProfit');
    const meterLoss = document.getElementById('meterLoss');
    const meterProfitLabel = document.getElementById('meterProfitLabel');
    const meterLossLabel = document.getElementById('meterLossLabel');
    const winrateMessage = document.getElementById('winrateMessage');
    const notificationArea = document.getElementById('notificationArea');
    const plInput = document.getElementById('plInput');
    const addPlBtn = document.getElementById('addPlBtn');
    const profitTab = document.getElementById('profitTab');
    const lossTab = document.getElementById('lossTab');

    // helper functions
    function saveAccounts() {
        localStorage.setItem('funded_accounts', JSON.stringify(accounts));
    }

    function saveActiveId() {
        if (activeAccountId) localStorage.setItem('activeAccountId', activeAccountId);
        else localStorage.removeItem('activeAccountId');
    }

    function formatMoney(v) { return '$' + v; }

    function showNotification(message, type = 'info') {
        notificationArea.innerHTML = `<div class="notification-banner">${message}</div>`;
        if (notificationTimeout) clearTimeout(notificationTimeout);
        notificationTimeout = setTimeout(() => {
            notificationArea.innerHTML = '';
        }, 4000);
    }

    function getWinrateEmoji(rate) {
        if (rate === 0) return '0% – Very bad 😬';
        if (rate <= 10) return '10% – Bad';
        if (rate <= 20) return '20% – Not good';
        if (rate <= 30) return '30% – Needs improvement';
        if (rate <= 40) return '40% – Below average';
        if (rate <= 50) return '50% – Average ⚖️';
        if (rate <= 60) return '60% – Good 👍';
        if (rate <= 70) return '70% – Very good 🔥';
        if (rate <= 80) return '80% – Excellent 🚀';
        if (rate <= 90) return '90% – Amazing 😳';
        return '100% – Wow! To the moon 🌕';
    }

    function getRateClass(rate) {
        if (rate < 40) return 'rate-red';
        if (rate < 60) return 'rate-yellow';
        if (rate < 80) return 'rate-green';
        return 'rate-gold';
    }

    function getActiveAccount() {
        return accounts.find(acc => acc.id === activeAccountId);
    }

    // check for phase progression or deactivation
    function checkAccountStatus(account) {
        if (!account || account.deactivated) return;

        const size = account.size;
        const classic = account.classic;
        const phase = account.phase;
        let profitTarget = 0;
        if (phase === 'Phase 01') profitTarget = Math.round(size * (classic ? 0.08 : 0.10));
        else if (phase === 'Phase 02') profitTarget = Math.round(size * 0.05);
        else profitTarget = Math.round(size * 0.10); // funded

        const maxLoss = Math.round(size * 0.1);

        // check max loss first (deactivation)
        if (account.totalLoss >= maxLoss) {
            account.deactivated = true;
            showNotification(`⚠️ Account deactivated: max loss reached`, 'error');
            saveAccounts();
            return;
        }

        // check profit target for phase progression (only if not funded)
        if (phase !== 'Funded !' && account.totalProfit >= profitTarget) {
            // move to next phase
            const nextPhase = phase === 'Phase 01' ? 'Phase 02' : 'Funded !';
            account.phase = nextPhase;
            // reset profit/loss stats
            account.totalProfit = 0;
            account.totalLoss = 0;
            account.wins = 0;
            account.losses = 0;
            saveAccounts();
            showNotification(`🎉 You passed ${phase}! Now in ${nextPhase}`, 'success');
        }
    }

    function renderAccountsList() {
        if (!accountsContainer) return;
        if (accounts.length === 0) {
            accountsContainer.innerHTML = '<div class="stat-label" style="padding: 20px; text-align: center;">No accounts yet. Tap "Add account"</div>';
            return;
        }
        let html = '';
        accounts.forEach((acc, idx) => {
            const isActive = (acc.id === activeAccountId);
            html += `
                <div class="account-item" style="border: ${isActive ? '2px solid var(--accent)' : 'none'};">
                    <div class="account-info">
                        <p><strong>${acc.nick || 'trader'}</strong> (${acc.email}) ${acc.deactivated ? '<span class="deactivated-badge">deactivated</span>' : ''}</p>
                        <p>${acc.phase} · ${acc.size/1000}K ${acc.classic ? 'classic' : 'standard'}</p>
                        <p>📈 ${acc.wins || 0} wins · 📉 ${acc.losses || 0} losses</p>
                    </div>
                    <div class="account-actions">
                        <button class="icon-btn set-active" data-id="${acc.id}"><i class="fas fa-check-circle" title="Set active"></i></button>
                        <button class="icon-btn edit-account" data-idx="${idx}"><i class="fas fa-edit"></i></button>
                        <button class="icon-btn delete-account" data-idx="${idx}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        accountsContainer.innerHTML = html;

        document.querySelectorAll('.set-active').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.dataset.id);
                activeAccountId = id;
                saveActiveId();
                renderAccountsList();
                updatePage1FromActive();
            });
        });

        document.querySelectorAll('.edit-account').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = btn.dataset.idx;
                const acc = accounts[idx];
                if (!acc) return;
                editingIndex = idx;
                openModal(true);
                nicknameInput.value = acc.nick || '';
                emailInput.value = acc.email || '';
                phaseSelect.value = acc.phase || 'Phase 01';
                classicToggle.checked = acc.classic || false;
                const size = acc.size || 5000;
                document.querySelectorAll('.size-btn').forEach(b => {
                    const btnSize = parseInt(b.dataset.size);
                    if (btnSize === size) b.classList.add('active');
                    else b.classList.remove('active');
                });
                selectedSize = size;
                renderRuleDetails();
                editingIndexInput.value = idx;
                modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit account';
            });
        });

        document.querySelectorAll('.delete-account').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = btn.dataset.idx;
                if (confirm('Delete this account?')) {
                    const deletedId = accounts[idx].id;
                    accounts.splice(idx, 1);
                    if (activeAccountId === deletedId) {
                        activeAccountId = accounts.length ? accounts[0].id : null;
                    }
                    saveAccounts();
                    saveActiveId();
                    renderAccountsList();
                    updatePage1FromActive();
                }
            });
        });
    }

    function updatePage1FromActive() {
        const active = getActiveAccount();
        if (!active) {
            phaseNameDisplay.innerHTML = `<i class="fas fa-flag"></i> no account`;
            activeAccountLabel.innerText = 'no account';
            plInput.disabled = true;
            addPlBtn.disabled = true;
            addPlBtn.style.background = 'var(--text-tertiary)';
            profitTargetEl.innerText = '$0';
            maxLossEl.innerText = '$0';
            totalProfitEl.innerText = '$0';
            profitRemainingEl.innerText = '$0';
            lossRemainingEl.innerText = '$0';
            winLossRateEl.innerText = '0%';
            meterProfit.style.width = '0%';
            meterLoss.style.width = '0%';
            meterProfitLabel.innerText = '0% profit';
            meterLossLabel.innerText = '0% loss';
            winrateMessage.innerHTML = '';
            return;
        }

        // disable inputs if deactivated
        const deactivated = active.deactivated || false;
        plInput.disabled = deactivated;
        addPlBtn.disabled = deactivated;
        addPlBtn.style.background = deactivated ? 'var(--text-tertiary)' : 'var(--accent)';
        profitTab.disabled = deactivated;
        lossTab.disabled = deactivated;

        phaseNameDisplay.innerHTML = `<i class="fas fa-flag"></i> ${active.phase} ${deactivated ? '🔴' : ''}`;
        activeAccountLabel.innerText = `${active.nick} (${active.email})`;

        let size = active.size;
        let classic = active.classic;
        let phase = active.phase;
        let profitTarget = 0;
        let maxLoss = Math.round(size * 0.1);
        if (phase === 'Phase 01') profitTarget = Math.round(size * (classic ? 0.08 : 0.10));
        else if (phase === 'Phase 02') profitTarget = Math.round(size * 0.05);
        else profitTarget = Math.round(size * 0.10);

        profitTargetEl.innerText = formatMoney(profitTarget);
        maxLossEl.innerText = formatMoney(maxLoss);

        let totalProfit = active.totalProfit || 0;
        let totalLoss = active.totalLoss || 0;
        let wins = active.wins || 0;
        let losses = active.losses || 0;

        totalProfitEl.innerText = formatMoney(totalProfit);
        let profitRem = Math.max(0, profitTarget - totalProfit);
        let lossRem = Math.max(0, maxLoss - totalLoss);
        profitRemainingEl.innerText = formatMoney(profitRem);
        lossRemainingEl.innerText = formatMoney(lossRem);

        let totalTrades = wins + losses;
        let winRate = totalTrades ? Math.round((wins / totalTrades) * 100) : 0;
        winLossRateEl.innerText = winRate + '%';

        // winrate message - only show if trades exist
        if (totalTrades > 0) {
            winrateMessage.innerHTML = `${getWinrateEmoji(winRate)} <span class="rate-badge ${getRateClass(winRate)}">${winRate}%</span>`;
        } else {
            winrateMessage.innerHTML = ''; // no trades, no message
        }

        // linear meter: profit% and loss% based on targets
        let profitPercent = Math.min(100, (totalProfit / profitTarget) * 100);
        let lossPercent = Math.min(100, (totalLoss / maxLoss) * 100);
        meterProfit.style.width = profitPercent + '%';
        meterLoss.style.width = lossPercent + '%';
        meterProfitLabel.innerText = Math.round(profitPercent) + '% profit';
        meterLossLabel.innerText = Math.round(lossPercent) + '% loss';
    }

    // modal rule details
    let selectedSize = 5000;
    function renderRuleDetails() {
        const size = selectedSize;
        const classic = classicToggle.checked;
        let profitPct1 = classic ? 8 : 10;
        let profitPct2 = 5;
        let fundedPct = 10;
        let maxLossPct = 10;
        let phase1Profit = Math.round(size * profitPct1 / 100);
        let phase2Profit = Math.round(size * profitPct2 / 100);
        let fundedProfit = Math.round(size * fundedPct / 100);
        let maxLossAmt = Math.round(size * maxLossPct / 100);
        ruleDetails.innerHTML = `
            <div><strong>Classic ${classic ? 'ON' : 'OFF'}</strong> · 1:100 · unlimited</div>
            <div style="display:flex; justify-content: space-between; margin-top:8px;"><span>📘 Phase1</span> <span class="profit">${profitPct1}% ${formatMoney(phase1Profit)}</span> <span class="loss">max ${maxLossPct}% ${formatMoney(maxLossAmt)}</span></div>
            <div style="display:flex; justify-content: space-between;"><span>📗 Phase2</span> <span class="profit">${profitPct2}% ${formatMoney(phase2Profit)}</span> <span class="loss">max ${maxLossPct}% ${formatMoney(maxLossAmt)}</span></div>
            <div style="display:flex; justify-content: space-between;"><span>💰 Funded</span> <span class="profit">${fundedPct}% ${formatMoney(fundedProfit)} scaling</span> <span class="loss">max ${maxLossPct}% ${formatMoney(maxLossAmt)}</span></div>
        `;
    }

    function openModal(isEdit = false) {
        modal.classList.add('show');
        if (!isEdit) {
            nicknameInput.value = '';
            emailInput.value = '';
            phaseSelect.value = 'Phase 01';
            classicToggle.checked = false;
            document.querySelectorAll('.size-btn').forEach(b => {
                if (parseInt(b.dataset.size) === 5000) b.classList.add('active');
                else b.classList.remove('active');
            });
            selectedSize = 5000;
            renderRuleDetails();
            editingIndexInput.value = -1;
            modalTitle.innerHTML = '<i class="fas fa-layer-plus"></i> Add account';
        }
    }

    function closeModal() { modal.classList.remove('show'); }

    sizeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            sizeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedSize = parseInt(btn.dataset.size);
            renderRuleDetails();
        });
    });

    classicToggle.addEventListener('change', renderRuleDetails);

    saveAccountBtn.addEventListener('click', () => {
        const nick = nicknameInput.value.trim() || 'trader';
        const email = emailInput.value.trim() || 'non@mail.com';
        const phase = phaseSelect.value;
        const classic = classicToggle.checked;
        const size = selectedSize;
        const editingIdx = parseInt(editingIndexInput.value);

        if (editingIdx >= 0 && editingIdx < accounts.length) {
            accounts[editingIdx] = {
                ...accounts[editingIdx],
                nick, email, phase, size, classic,
                deactivated: false // reset deactivated on edit
            };
        } else {
            const newAccount = {
                id: Date.now(),
                nick, email, phase, size, classic,
                totalProfit: 0,
                totalLoss: 0,
                wins: 0,
                losses: 0,
                deactivated: false
            };
            accounts.push(newAccount);
        }
        saveAccounts();
        renderAccountsList();
        if (!activeAccountId && accounts.length) {
            activeAccountId = accounts[0].id;
            saveActiveId();
        }
        updatePage1FromActive();
        closeModal();
    });

    openAddAccountBtn.addEventListener('click', () => {
        editingIndex = -1;
        editingIndexInput.value = -1;
        openModal(false);
    });

    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // FIXED: Loss now subtracts from profit
    addPlBtn.addEventListener('click', () => {
        const active = getActiveAccount();
        if (!active) { alert('Select an account first'); return; }
        if (active.deactivated) { alert('Account is deactivated'); return; }
        const val = parseFloat(plInput.value);
        if (isNaN(val) || val <= 0) return;
        const isProfit = profitTab.classList.contains('active');

        if (isProfit) {
            active.totalProfit = (active.totalProfit || 0) + val;
            active.wins = (active.wins || 0) + 1;
        } else {
            // Subtract loss from profit (but don't go below 0)
            active.totalProfit = Math.max(0, (active.totalProfit || 0) - val);
            active.totalLoss = (active.totalLoss || 0) + val;
            active.losses = (active.losses || 0) + 1;
        }
        saveAccounts();
        checkAccountStatus(active);
        updatePage1FromActive();
        plInput.value = '';
    });

    profitTab.addEventListener('click', () => {
        profitTab.classList.add('active');
        lossTab.classList.remove('active');
    });
    
    lossTab.addEventListener('click', () => {
        lossTab.classList.add('active');
        profitTab.classList.remove('active');
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            document.getElementById('page1').classList.remove('active-page');
            document.getElementById('page2').classList.remove('active-page');
            document.getElementById(`page${page}`).classList.add('active-page');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            if (page === '2') renderAccountsList();
        });
    });

    document.getElementById('themeToggle').addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const icon = document.querySelector('#themeToggle i');
        icon.className = document.body.classList.contains('dark') ? 'fas fa-sun' : 'fas fa-moon';
    });

    // initial render
    renderAccountsList();
    updatePage1FromActive();
    renderRuleDetails();
    profitTab.classList.add('active');
})();