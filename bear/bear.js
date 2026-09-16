let bearSave = null;

const newSaveButton = document.getElementById("newSave");
const loadSaveButton = document.getElementById("loadSave");
const fileInput = document.getElementById("fileInput");


// CREATE NEW SAVE
newSaveButton.addEventListener("click", function () {

  bearSave = {
    bearVersion: "1.0",
    created: new Date().toISOString(),
    days: []
  };

  alert("New BEAR save created.");

  showSaveControls();
});


// LOAD EXISTING SAVE
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

        alert("This is not a valid BEAR save file.");
        return;

      }

      bearSave = data;

      alert(
        "BEAR save loaded.\n\n" +
        "Days remembered: " +
        bearSave.days.length
      );

      showSaveControls();

    } catch (error) {

      alert("Couldn't read this save file.");

    }

  };

  reader.readAsText(file);

});


// SHOW SAVE BUTTON AFTER CREATING/LOADING
function showSaveControls() {

  if (document.getElementById("saveFileButton")) return;

  const button = document.createElement("button");

  button.id = "saveFileButton";

  button.textContent = "💾 Save BEAR File";

  button.addEventListener("click", downloadSave);

  document.getElementById("home").appendChild(button);

}


// DOWNLOAD SAVE FILE
function downloadSave() {

  if (!bearSave) {

    alert("There is no BEAR save to download.");
    return;

  }

  const data = JSON.stringify(bearSave, null, 2);

  const blob = new Blob(
    [data],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download =
    "BEAR_SAVE_" +
    new Date().toISOString().slice(0, 10) +
    ".json";

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);

}
