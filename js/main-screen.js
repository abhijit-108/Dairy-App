

function validateInput() {
    var fat = parseFloat(document.getElementById("fat").value);
    var snf = parseFloat(document.getElementById("snf").value);

    // Check if the input values are in the valid range (excluding KG check)
    if (fat < 1.1 || fat > 12.1 || snf < 3.1 || snf > 12.1) {
        showAlert("Error: Invalid Fat or SNF!", "error"); // Show red cross alert
        return false;
    }

    // Calculate rate and total
    rateandtotal();

    // Show success alert (red checkmark)
    showAlert("Success!", "success");

    return true;
}

// Function to show alert with custom message and type (success/error)
function showAlert(message, type) {
    var alertBox = document.createElement("div");
    alertBox.classList.add("alert", type);
    alertBox.innerHTML = `<div class="icon">${type === "success" ? "✔️" : "❌"}</div> ${message}`;

    document.body.appendChild(alertBox);

    // Remove after animation
    setTimeout(() => {
        alertBox.classList.add("fadeOut");
        setTimeout(() => {
            alertBox.remove();
        }, 500);
    }, 2000);
}

// Event listener for the submit button
document.getElementById('submit').addEventListener('click', function () {
    if (validateInput()) {
        multiplyNumbers();
    }
});
