function fetchNamesAndEmails() {
    fetch(`names.md?v=${new Date().getTime()}`) // Append cache-busting query string
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            // Split data by new lines
            const lines = data.trim().split('\n');

            // Populate dropdown with names and map names to emails
            const selectElement = document.getElementById('name');
            const emailMap = new Map();
            lines.forEach(line => {
                const [name, email] = line.includes('|') ? line.split('|').map(item => item.trim()) : [line.trim(), ''];
                if (name) {
                    const option = document.createElement('option');
                    option.text = name;
                    option.value = name;
                    selectElement.add(option);
                    emailMap.set(name, email);
                }
            });

            // Add event listener to update email input when a name is selected
            selectElement.addEventListener('change', function () {
                const selectedName = this.value;
                document.getElementById('email').value = emailMap.get(selectedName) || '';
            });
        })
        .catch(error => console.error('Error fetching names and emails:', error));
}

window.onload = fetchNamesAndEmails;
