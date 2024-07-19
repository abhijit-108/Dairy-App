// Initialize EmailJS with your user ID
emailjs.init("MsvkQlQB-IBhoc9UM"); // Replace "your_user_id" with your actual EmailJS user ID
// Function to send email
function sendEmail() {
    // Get form data
    var name = document.getElementById('name').value;
    var email = document.getElementById('email').value;
    var fat = document.getElementById('fat').value;
    var snf = document.getElementById('snf').value;
    var rate = document.getElementById('rate').value;
    var kg = document.getElementById('kg').value;
    var total = document.getElementById('total').value;

    // Check if email is not empty
    if (email.trim() !== '') {
        // Prepare email parameters
        var templateParams = {
            to_email: email,
            from_name: name,
            fat: fat,
            snf: snf,
            rate: rate,
            kg: kg,
            total: total
        };

        emailjs.send("service_l", "template_", templateParams)
            .then(function (response) {
                console.log('Email sent successfully:', response);
                // Display success message or perform other actions
            }, function (error) {
                console.error('Email send failed:', error);
                // Display error message or perform other actions
            });
    } else {
        console.error('Recipient email address is empty');
    }
}