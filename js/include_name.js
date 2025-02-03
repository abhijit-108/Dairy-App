function fetchNames() {
    fetch(`names.md?v=${new Date().getTime()}`) // Append cache-busting query string
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            // Split data by new lines and trim each line
            const names = data.trim().split('\n').map(name => name.trim()).filter(name => name);

            // Populate dropdown with names
            const selectElement = document.getElementById('name');
            selectElement.innerHTML = '<option value="" disabled selected>Select a name</option>'; // Reset options

            names.forEach(name => {
                const option = document.createElement('option');
                option.textContent = name;
                option.value = name;
                selectElement.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching names:', error));
}

window.onload = fetchNames;
