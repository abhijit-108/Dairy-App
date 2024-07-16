const fatvaluedairy=3.81
const snfvaluedairy=2.689
const ratevaluedairy=(4.5 * fatvaluedairy) + (8.5* snfvaluedairy);
document.getElementById("fixcurrentrate").innerHTML =  "Rate " +ratevaluedairy.toFixed(2);


function rateandtotal() {
    var fat = document.getElementById("fat").value;
    var snf = document.getElementById("snf").value;
    var kg = document.getElementById("kg").value;

    var Rate = (fat * fatvaluedairy) + (snf * snfvaluedairy);
    var Total = Rate * kg;
    var fixtedotal = Math.round(Total);
    var fixedrate = Rate.toFixed(2);

    document.getElementById('rate').value = fixedrate;
    document.getElementById('total').value = fixtedotal;
}

//after button click multiply numbers
function multiplyNumbers() {
    // Get the input values
    var fat = document.getElementById("fat").value;
    var snf = document.getElementById("snf").value;
    var kg = document.getElementById("kg").value;

    var Rate = (fat * fatvaluedairy) + (snf * snfvaluedairy);
    var Total = Rate * kg;
    var fixtedotal = Math.round(Total);
    var fixedrate = Rate.toFixed(2);

    document.getElementById("ratedisplay").innerHTML = "Rate: " + fixedrate;
    document.getElementById("totaldisplay").innerHTML = "Total Rs: " + fixtedotal;
}
