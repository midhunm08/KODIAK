let bearSave = null;

const newSaveButton = document.getElementById("newSave");
const loadSaveButton = document.getElementById("loadSave");
const fileInput = document.getElementById("fileInput");


newSaveButton.addEventListener("click", function () {

  bearSave = {

    bearVersion: "1.0",

    created: new Date().toISOString(),

    days: []

  };

  alert("New BEAR save created.");

});


loadSaveButton.addEventListener("click", function () {

  fileInput.click();

});


fileInput.addEventListener("change", function (event) {

  const file = event.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function () {

    try {

      const data = JSON.parse(reader.result);

      if (!data.days || !Array.isArray(data.days)) {

        alert("That doesn't look like a BEAR save file.");

        return;

      }

      bearSave = data;

      alert(
        "BEAR save loaded.\n\n" +
        "Days remembered: " +
        bearSave.days.length
      );

    } catch (error) {

      alert("Couldn't read that save file.");

    }

  };

  reader.readAsText(file);

});
