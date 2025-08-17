
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
        import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
        import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";


        const firebaseConfig = {
            apiKey: "AIzaSyAuhNKygw6dv8jqfNY8qnmIrX-TsLy2jvI",
            authDomain: "dairy-app-abhijit.firebaseapp.com",
            databaseURL: "https://dairy-app-abhijit-default-rtdb.firebaseio.com",
            projectId: "dairy-app-abhijit",
            storageBucket: "dairy-app-abhijit.appspot.com",
            messagingSenderId: "196152880143",
            appId: "1:196152880143:web:bec02170e30932a7d5877a"
        };
        const app = initializeApp(firebaseConfig);
        const database = getDatabase();
        const auth = getAuth();

        // Global variables for rate calculation
        let rateFormula = { fatMultiplier: 3.81, snfMultiplier: 2.689 }; // Default values
        let cachedRateFormula = null;

        // Audio feedback function using MP3 files
        function playAudioMessage(audioType) {
            const audioEnabled = document.getElementById('audioEnabled').checked;

            if (!audioEnabled) {
                return;
            }

            let audioElement;

            switch (audioType) {
                case 'success':
                    audioElement = document.getElementById('successAudio');
                    break;
                case 'exists':
                    audioElement = document.getElementById('existsAudio');
                    break;
                case 'failed':
                    audioElement = document.getElementById('failedAudio');
                    break;
                case 'warning':
                    audioElement = document.getElementById('warningAudio');
                    break;
                default:
                    return;
            }

            if (audioElement) {
                audioElement.currentTime = 0;
                audioElement.play().catch(error => {
                    console.log('Audio play failed:', error);
                });
            }
        }

        let cachedNames = null;

        async function loadRateFormula() {
            if (cachedRateFormula) {
                return;
            }

            try {
                const response = await fetch('rate.md');
                if (!response.ok) {
                    throw new Error('Could not fetch rate.md file');
                }
                const content = await response.text();

                const lines = content.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                let latestFormula = null;

                for (const line of lines) {
                    if (line.includes('{Latest}')) {
                        latestFormula = line;
                        break;
                    }
                }

                if (!latestFormula) {
                    const formulaLines = lines.filter(line =>
                        line.includes('var Rate') ||
                        (line.includes('fat') && line.includes('snf'))
                    );
                    if (formulaLines.length > 0) {
                        latestFormula = formulaLines[formulaLines.length - 1];
                    }
                }

                if (latestFormula) {
                    const fatMatch = latestFormula.match(/fat\s*\*\s*([\d.]+)/);
                    const snfMatch = latestFormula.match(/snf\s*\*\s*([\d.]+)/);

                    if (fatMatch && snfMatch) {
                        const formula = {
                            fatMultiplier: parseFloat(fatMatch[1]),
                            snfMultiplier: parseFloat(snfMatch[1]),
                            display: latestFormula.replace('{Latest}', '').trim()
                        };

                        cachedRateFormula = formula;
                        rateFormula = formula;
                    } else {
                        throw new Error('Could not parse rate formula');
                    }
                } else {
                    throw new Error('No rate formula found in rate.md');
                }
            } catch (error) {
                console.error('Error loading rate formula:', error);
            }
        }

        async function loadNamesFromFile() {
            if (cachedNames) {
                populateNameDropdown(cachedNames);
                return;
            }

            try {
                const response = await fetch('name.md');
                if (!response.ok) {
                    throw new Error('Could not fetch name.md file');
                }
                const content = await response.text();

                const names = content.split('\n')
                    .map(name => name.trim())
                    .filter(name => name.length > 0)
                    .map(name => name.replace(/\r/g, ''));

                cachedNames = names;
                populateNameDropdown(names);
            } catch (error) {
                console.error('Error loading names:', error);
                const nameSelect = document.getElementById('nameSelect');
                nameSelect.innerHTML = '<option value=\"\">Error loading names - Check if name.md exists</option>';
            }
        }

        function populateNameDropdown(names) {
            const nameSelect = document.getElementById('nameSelect');
            nameSelect.innerHTML = '<option value=\"\">Choose a name...</option>';

            names.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                nameSelect.appendChild(option);
            });
        }

        function calculateRate(fat, snf) {
            return (fat * rateFormula.fatMultiplier + snf * rateFormula.snfMultiplier).toFixed(2);
        }

        // Example usage:
        let fat = 4.5;
        let snf = 8.5;

        let rate = calculateRate(fat, snf);

        // update #fix_rate element
        document.getElementById("fix_rate").textContent = "Current Rate : " + rate;
        document.getElementById("fix_rate1").textContent = "Current Rate : " + rate;





        function generateKey(name) {
            return name.trim().replace(/\s+/g, '-');
        }

        function getCurrentDateTime() {
            const now = new Date();
            const day = now.getDate().toString().padStart(2, '0');
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const year = now.getFullYear();
            const time = now.toLocaleString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            return `${day}/${month}/${year} ${time}`;
        }

        function getCurrentDateKey() {
            const now = new Date();
            return `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
        }

        function getCurrentSession() {
            const hour = new Date().getHours();
            return hour < 15 ? "সকাল" : "সন্ধ্যা";
        }

        function showPopup(type, title, data, statusText, existingData = null) {
            const overlay = document.getElementById('popupOverlay');
            const card = document.getElementById('popupCard');
            const statusMessage = document.getElementById('statusMessage');
            const popupTitle = document.getElementById('popupTitle');
            const popupDetails = document.getElementById('popupDetails');
            const existingEntry = document.getElementById('existingEntry');
            const existingEntryDetails = document.getElementById('existingEntryDetails');
            const updateBtn = document.getElementById('updateBtn');

            card.className = 'popup-card';
            existingEntry.style.display = 'none';
            updateBtn.style.display = 'none';
            updateBtn.disabled = false;

            if (type === 'duplicate') {
                card.classList.add('duplicate');
                statusMessage.className = 'status-message status-duplicate';
                existingEntry.style.display = 'block';
                updateBtn.style.display = 'inline-block';

                if (existingData) {
                    existingEntryDetails.innerHTML = `
                        <div><strong>Name:</strong> <span>${existingData.name}</span></div>
                        <div><strong>Date & Time:</strong> <span>${existingData.timestamp}</span></div>
                        <div><strong>KG:</strong> <span>${existingData.kg}</span></div>
                        <div><strong>FAT:</strong> <span>${existingData.fat}</span></div>
                        <div><strong>SNF:</strong> <span>${existingData.snf}</span></div>
                        <div><strong>Rate:</strong> <span>${existingData.rate}</span></div>
                        <div><strong>Total:</strong> <span>${existingData.total}</span></div>
                    `;
                }
            } else {
                card.classList.add(type);
                statusMessage.className = `status-message status-${type === 'success' ? 'success' : type === 'failed' ? 'failed' : 'warning'}`;
            }

            statusMessage.textContent = statusText;
            popupTitle.textContent = title;

            if (data) {
                popupDetails.innerHTML = `
                    <div><strong>Name:</strong> <span>${data.name}</span></div>
                    <div><strong>Date & Time:</strong> <span>${data.timestamp}</span></div>
                    <div><strong>KG:</strong> <span>${data.kg}</span></div>
                    <div><strong>FAT:</strong> <span>${data.fat}</span></div>
                    <div><strong>SNF:</strong> <span>${data.snf}</span></div>
                    <div><strong>Rate:</strong> <span>${data.rate}</span></div>
                    <div><strong>Total:</strong> <span>${data.total}</span></div>
                `;
            } else {
                popupDetails.innerHTML = '';
            }

            overlay.style.display = 'flex';

            setTimeout(() => {
                const audioType = type === 'duplicate' ? 'exists' : type;
                playAudioMessage(audioType);
            }, 300);

            if (type === 'success' || type === 'failed') {
                setTimeout(() => {
                    card.classList.remove('success', 'failed');
                }, 10000);
            }
        }

        function hidePopup() {
            const overlay = document.getElementById('popupOverlay');
            overlay.style.display = 'none';
        }

        async function checkNameExists(name, dateKey, session) {
            try {
                const nameKey = generateKey(name);
                const dbRef = ref(database);
                const snapshot = await get(child(dbRef, `records/${dateKey}/${nameKey}/${session}`));

                if (snapshot.exists()) {
                    return {
                        exists: true,
                        data: snapshot.val()
                    };
                }
                return { exists: false, data: null };
            } catch (error) {
                console.error('Error checking name existence:', error);
                return { exists: false, data: null };
            }
        }

        async function saveToFirebase(data) {
            try {
                const dateKey = getCurrentDateKey();
                const session = getCurrentSession();
                const nameKey = generateKey(data.name);

                const recordPath = `records/${dateKey}/${nameKey}/${session}`;

                await set(ref(database, recordPath), {
                    name: data.name,
                    kg: data.kg,
                    fat: data.fat,
                    snf: data.snf,
                    rate: data.rate,
                    total: data.total,
                    timestamp: data.timestamp
                });

                return true;
            } catch (error) {
                console.error('Error saving to Firebase:', error);
                return false;
            }
        }

        let pendingSaveData = null;

        Promise.all([
            loadNamesFromFile(),
            loadRateFormula()
        ]).then(() => {
            console.log('All data loaded successfully');
        }).catch(error => {
            console.error('Error loading initial data:', error);
        });

        document.getElementById('milkForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            const name = document.getElementById('nameSelect').value;
            const kg = parseFloat(document.getElementById('kg').value) || 0;
            const fat = parseFloat(document.getElementById('fat').value) || 0;
            const snf = parseFloat(document.getElementById('snf').value) || 0;

            if (fat < 2.0 || fat > 8.0) {
                showPopup('warning', 'Invalid FAT', { name, kg, fat, snf }, 'FAT must be between 2.0 and 8.0');
                return;
            }

            if (snf < 2.0 || snf > 12.0) {
                showPopup('warning', 'Invalid SNF', { name, kg, fat, snf }, 'SNF must be between 2.0 and 12.0');
                return;
            }

            if (kg < 0.1 || kg > 100.0) {
                showPopup('warning', 'Invalid KG', { name, kg, fat, snf }, 'KG must be between 0.1 and 100');
                return;
            }
            // --- End validation ---

            const rate = calculateRate(fat, snf);
            const total = Math.round(kg * parseFloat(rate));

            const data = {
                name: name || 'NA',
                kg: kg.toFixed(3),
                fat: fat.toFixed(1),
                snf: snf.toFixed(1),
                rate: rate,
                total: total.toString(),
                timestamp: getCurrentDateTime()
            };

            if (!name) {
                showPopup('warning', 'Warning: No Name', data, 'Please select a name');
                return;
            }

            const dateKey = getCurrentDateKey();
            const session = getCurrentSession();
            const { exists, data: existingData } = await checkNameExists(name, dateKey, session);

            if (exists) {
                pendingSaveData = data;
                showPopup(
                    'duplicate',
                    'Entry Already Exists',
                    data,
                    `${name} ${session === 'সকাল' ? 'সকাল' : 'সন্ধ্যা'} Already Exists`,
                    existingData
                );
                return;
            }

            const saveSuccess = await saveToFirebase(data);

            if (saveSuccess) {
                showPopup('success', 'Success', data, 'Data saved successfully!');

                document.getElementById('milkForm').reset();
                document.getElementById('nameSelect').value = '';
            } else {
                showPopup('failed', 'Save Failed', data, 'Failed to save data to Firebase. Please try again.');
            }
        });

        document.getElementById('updateBtn').addEventListener('click', async function () {
            const updateBtn = document.getElementById('updateBtn');
            if (!pendingSaveData) {
                console.warn('No pending data to update.');
                return;
            }

            updateBtn.disabled = true;
            updateBtn.textContent = 'Updating...';

            pendingSaveData.timestamp = getCurrentDateTime();

            const success = await saveToFirebase(pendingSaveData);

            if (success) {
                showPopup('success', 'Entry Updated Successfully', pendingSaveData, 'Existing entry has been updated with new values.');
                pendingSaveData = null;
                document.getElementById('milkForm').reset();
                document.getElementById('nameSelect').value = '';
            } else {
                showPopup('failed', 'Update Failed', pendingSaveData, 'Failed to update the existing entry. Please try again.');
            }

            updateBtn.disabled = false;
            updateBtn.textContent = 'Update Entry';
        });

        document.getElementById('closeBtn').addEventListener('click', hidePopup);

        document.getElementById('popupOverlay').addEventListener('click', function (e) {
            if (e.target === this) {
                hidePopup();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                hidePopup();
            }
        });

        document.addEventListener('click', function enableAudio() {
            const audioElements = document.querySelectorAll('audio');
            audioElements.forEach(audio => {
                audio.load();
            });
            document.removeEventListener('click', enableAudio);
        }, { once: true });



        const milkApp = initializeApp(firebaseConfig);
        const milkDatabase = getDatabase();

        function formatMilkDate(date) {
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        }

        function formatMilkDisplayDate(date) {
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        }

        function populateMilkDateDropdown() {
            const dateSelector = document.getElementById('milkDateSelector');
            const today = new Date();

            dateSelector.innerHTML = '';

            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);

                const option = document.createElement('option');
                option.value = formatMilkDate(date);
                option.textContent = i === 0 ? `Today (${formatMilkDisplayDate(date)})` : formatMilkDisplayDate(date);

                dateSelector.appendChild(option);
            }
        }

        function extractMilkTime(timestamp) {
            if (!timestamp) return '';
            const match = timestamp.match(/(\d{1,2}:\d{2})\s*(am|pm)/i);
            if (!match) return '';
            return `${match[1]} ${match[2].toUpperCase()}`;
        }



        async function fetchMilkDataForDate(selectedDate) {
            const dataContainer = document.getElementById('milkDataContainer');

            dataContainer.innerHTML = `
                <div class="milk-loading-state">
                    <div class="milk-loading-spinner"></div>
                    <div>Loading records for ${selectedDate}...</div>
                </div>
            `;

            try {
                const dbRef = ref(milkDatabase);
                const snapshot = await get(child(dbRef, `records/${selectedDate}`));

                if (snapshot.exists()) {
                    dataContainer.innerHTML = displayMilkData(snapshot.val());
                } else {
                    dataContainer.innerHTML = `
                        <div class="milk-empty-state">
                            📋 No milk records found for ${selectedDate}
                        </div>
                    `;
                }
            } catch (error) {
                console.error("Error fetching milk data:", error);
                dataContainer.innerHTML = `
                    <div class="milk-error-state">
                        ❌ Error loading milk records. Please try again.
                    </div>
                `;
            }
        }

        function timeToMinutes(timeStr) {
            if (!timeStr) return 0;
            const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!match) return 0;

            let hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            const period = match[3].toUpperCase();

            if (period === "PM" && hours !== 12) hours += 12;
            if (period === "AM" && hours === 12) hours = 0;

            return hours * 60 + minutes;
        }

        function displayMilkData(data) {
            let totalKg = 0, totalAmount = 0, totalFat = 0, totalSnf = 0, totalRate = 0;

            let recordsArray = [];
            for (const personKey in data) {
                for (const timeSlot in data[personKey]) {
                    const record = data[personKey][timeSlot];
                    recordsArray.push(record);
                }
            }

            recordsArray.sort((a, b) => {
                return timeToMinutes(extractMilkTime(b.timestamp)) -
                    timeToMinutes(extractMilkTime(a.timestamp));
            });

            let rows = '';
            for (const record of recordsArray) {
                const kg = parseFloat(record.kg) || 0;

                rows += `
        <tr class="milk-data-row">
            <td class="milk-data-cell milk-time-cell">${extractMilkTime(record.timestamp)}</td>
            <td class="milk-data-cell milk-name-cell">${record.name}</td>
            <td class="milk-data-cell"><span class="milk-metric-badge">${record.fat}</span></td>
            <td class="milk-data-cell"><span class="milk-metric-badge">${record.snf}</span></td>
            <td class="milk-data-cell">₹${record.rate}</td>
            <td class="milk-data-cell">${record.kg} kg</td>
            <td class="milk-data-cell milk-amount-cell">₹${record.total}</td>
        </tr>`;

                totalKg += kg;
                totalAmount += parseFloat(record.total) || 0;
                totalFat += parseFloat(record.fat) * kg || 0;
                totalSnf += parseFloat(record.snf) * kg || 0;
                totalRate += parseFloat(record.rate) * kg || 0;
            }

            const avgFat = totalKg ? (totalFat / totalKg).toFixed(1) : '0.00';
            const avgSnf = totalKg ? (totalSnf / totalKg).toFixed(1) : '0.00';
            const avgRate = totalKg ? (totalRate / totalKg).toFixed(2) : '0.00';

            return `
    <table class="milk-records-table">
        <thead class="milk-table-header">
            <tr>
                <th class="milk-header-cell">⏰ Time</th>
                <th class="milk-header-cell">👤 Name</th>
                <th class="milk-header-cell">🧈 FAT</th>
                <th class="milk-header-cell">🥛 SNF</th>
                <th class="milk-header-cell">💰 Rate</th>
                <th class="milk-header-cell">⚖️ Weight</th>
                <th class="milk-header-cell">💵 Total</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
            <tr class="milk-summary-row">
                <td class="milk-data-cell" colspan="2"><strong>📊 TOTAL/AVERAGE</strong></td>
                <td class="milk-data-cell"><strong>${avgFat}</strong></td>
                <td class="milk-data-cell"><strong>${avgSnf}</strong></td>
                <td class="milk-data-cell"><strong>₹${avgRate}</strong></td>
                <td class="milk-data-cell"><strong>${totalKg.toFixed(3)} kg</strong></td>
                <td class="milk-data-cell"><strong>₹${totalAmount.toFixed(0)}</strong></td>
            </tr>
        </tbody>
    </table>`;
        }


        document.addEventListener('DOMContentLoaded', function () {
            populateMilkDateDropdown();

            const dateSelector = document.getElementById('milkDateSelector');
            fetchMilkDataForDate(dateSelector.value);

            dateSelector.addEventListener('change', function () {
                fetchMilkDataForDate(this.value);
            });
        });



        document.getElementById('milkForm').addEventListener('submit', function (e) {
            e.preventDefault();

            const dateSelector = document.getElementById('milkDateSelector');

            setTimeout(() => {
                fetchMilkDataForDate(dateSelector.value);
            }, 6000);
        });



        // Function to handle logout
        function logout() {
            signOut(auth).then(() => {
                // Sign-out successful, redirect to login page
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error('Error signing out:', error);
            });
        }

        // Attach event listener to logout button
        document.getElementById('logoutButton').addEventListener('click', logout);
        // Check authentication status
        onAuthStateChanged(auth, (user) => {
            const userInfoDiv = document.getElementById('logoutButton');
            const hide_names = document.getElementById('hide_names');
            const headerLogin = document.getElementById('headerLogin');


            // const billvalidate=document.querySelector('.billvalidate')

            if (user) {
                // User is authenticated, show user name
                userInfoDiv.innerText = 'Logout (Abhijit)';
                hide_names.classList.remove('disabled');
                headerLogin.classList.remove('headerloginguest');

            } else {
                // User is not authenticated, show guest
                userInfoDiv.innerText = 'Logout (Guest)';
                hide_names.classList.add('disabled');
                headerLogin.classList.add('headerloginguest');
            }
        });
    