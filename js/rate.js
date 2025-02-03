window.convertion_ratio_29taka = (29 / 40.5);

const fatvaluedairy = 3.81
const snfvaluedairy = 2.689
window.dairy_original_fat = 3.81;
window.dairy_original_snf = 2.689;


const ratevaluedairy = (4.5 * fatvaluedairy) + (8.5 * snfvaluedairy);
document.getElementById("fixcurrentrate").innerHTML = "Rate " + ratevaluedairy.toFixed(2);


function rateandtotal() {
    var fat = document.getElementById("fat").value;
    var snf = document.getElementById("snf").value;
    var kg = document.getElementById("kg").value;

    var Rate = (fat * fatvaluedairy) + (snf * snfvaluedairy);
    var Total = (kg * Rate);
    var fixtedotal = Math.round(Total);
    var fixedrate = Rate.toFixed(2);

    document.getElementById('rate').value = fixedrate;
    document.getElementById('total').value = fixtedotal;
}

