const questions = [

  {
    category: "Morning",
    text: "When did your day begin, and how did you feel when you woke up?",
    hint: "Sleep, mood, energy, first thoughts — whatever stands out."
  },

  {
    category: "Morning",
    text: "What did you do during the first part of your day?",
    hint: "Routine, breakfast, studying, travelling, scrolling, anything."
  },

  {
    category: "Work",
    text: "What happened during work or your main responsibility today?",
    hint: "Tell me what you actually did, not just what you were supposed to do."
  },

  {
    category: "Work",
    text: "Was there anything difficult, frustrating, embarrassing or satisfying today?",
    hint: "Small things count too."
  },

  {
    category: "People",
    text: "Who did you interact with today, and how did those interactions feel?",
    hint: "Friends, family, colleagues, partner, strangers — whoever mattered."
  },

  {
    category: "Mind",
    text: "What was going on inside your head today?",
    hint: "Thoughts, worries, confidence, calmness, overthinking, excitement."
  },

  {
    category: "Body",
    text: "How was your body today?",
    hint: "Sleep, food, exercise, tiredness, headache, energy, physical comfort."
  },

  {
    category: "Personal",
    text: "What did you do today purely for yourself?",
    hint: "Entertainment, hobbies, rest, learning, walking, games, anything."
  },

  {
    category: "Progress",
    text: "Did you move forward in anything that matters to you?",
    hint: "CA, career, relationships, health, learning, personal growth."
  },

  {
    category: "Low point",
    text: "What was the worst part of today?",
    hint: "Be honest. Bear isn't here to judge you."
  },

  {
    category: "High point",
    text: "What was the best part of today?",
    hint: "Even if the answer is something tiny."
  },

  {
    category: "Reflection",
    text: "If you had to describe today in one sentence, what would you say?",
    hint: "Your own words. This becomes part of your diary."
  }

];


let currentQuestion = 0;
let answers = [];

function startReflection() {

  currentQuestion = 0;
  answers = [];

  showScreen("questions");
  displayQuestion();

}


function displayQuestion() {

  const q = questions[currentQuestion];

  document.getElementById("questionNumber").textContent =
    `${currentQuestion + 1} / ${questions.length}`;

  document.getElementById("questionCategory").textContent =
    q.category;

  document.getElementById("questionText").textContent =
    q.text;

  document.getElementById("questionHint").textContent =
    q.hint;

  document.getElementById("answer").value =
    answers[currentQuestion] || "";

  document.getElementById("progressBar").style.width =
    `${((currentQuestion + 1) / questions.length) * 100}%`;

}


function nextQuestion() {

  const answer = document.getElementById("answer").value.trim();

  answers[currentQuestion] = answer;

  if (currentQuestion < questions.length - 1) {

    currentQuestion++;

    displayQuestion();

  } else {

    showScreen("rating");

  }

}


function previousQuestion() {

  if (currentQuestion > 0) {

    answers[currentQuestion] =
      document.getElementById("answer").value.trim();

    currentQuestion--;

    displayQuestion();

  }

}


function showScreen(id) {

  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  document.getElementById(id).classList.add("active");

  window.scrollTo(0, 0);

}


function setupSliders() {

  const sliders = [
    ["mood", "moodValue"],
    ["energy", "energyValue"],
    ["productivity", "productivityValue"],
    ["mental", "mentalValue"],
    ["relationship", "relationshipValue"],
    ["growth", "growthValue"]
  ];

  sliders.forEach(([slider, value]) => {

    document.getElementById(slider).addEventListener("input", function() {

      document.getElementById(value).textContent =
        this.value;

    });

  });

}


function generateReport() {

  const scores = {

    mood: Number(document.getElementById("mood").value),

    energy: Number(document.getElementById("energy").value),

    productivity: Number(document.getElementById("productivity").value),

    mental: Number(document.getElementById("mental").value),

    relationship: Number(document.getElementById("relationship").value),

    growth: Number(document.getElementById("growth").value)

  };


  /*
    Different areas have slightly different importance.
    This can be changed later when we build the real scoring engine.
  */

  const score =
    (
      scores.mood * 0.20 +
      scores.energy * 0.10 +
      scores.productivity * 0.20 +
      scores.mental * 0.20 +
      scores.relationship * 0.15 +
      scores.growth * 0.15
    ) * 10;


  let verdict;

  if (score >= 75) {
    verdict = "GOOD DAY";
  } else if (score >= 50) {
    verdict = "AVERAGE DAY";
  } else {
    verdict = "BAD DAY";
  }


  const observation = createObservation(scores, score);

  const diary = createDiary(scores, score);


  document.getElementById("reportDate").textContent =
    new Date().toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

  document.getElementById("finalScore").textContent =
    Math.round(score);

  document.getElementById("dayVerdict").textContent =
    verdict;

  document.getElementById("bearObservation").textContent =
    observation;

  document.getElementById("diaryText").textContent =
    diary;


  document.getElementById("rMood").textContent =
    scores.mood + "/10";

  document.getElementById("rEnergy").textContent =
    scores.energy + "/10";

  document.getElementById("rProductivity").textContent =
    scores.productivity + "/10";

  document.getElementById("rMental").textContent =
    scores.mental + "/10";

  document.getElementById("rRelationship").textContent =
    scores.relationship + "/10";

  document.getElementById("rGrowth").textContent =
    scores.growth + "/10";


  saveDay(scores, score, verdict, diary);

  showScreen("report");

}


function createObservation(scores, score) {

  const values = [
    ["mood", scores.mood],
    ["energy", scores.energy],
    ["productivity", scores.productivity],
    ["mental state", scores.mental],
    ["relationships", scores.relationship],
    ["personal growth", scores.growth]
  ];

  values.sort((a, b) => b[1] - a[1]);

  const strongest = values[0][0];
  const weakest = values[values.length - 1][0];


  if (score >= 75) {

    return `Bear sees a strong day here. Your strongest area was ${strongest}, while ${weakest} was the part that pulled the day down a little. Not everything needs to be perfect for a day to count as good.`;

  }

  if (score >= 50) {

    return `A mixed day. ${strongest} seems to have carried you, while ${weakest} was the roughest area. Nothing dramatic — just a day with both good and difficult pieces.`;

  }

  return `This looks like a genuinely difficult day. ${weakest} seems to have taken the biggest hit. The important thing is that the day was recorded instead of simply disappearing into memory.`;

}


function createDiary(scores, score) {

  const today =
    new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric"
    });


  const morning = answers[0];
  const work = answers[2];
  const difficulty = answers[3];
  const people = answers[4];
  const mind = answers[5];
  const body = answers[6];
  const personal = answers[7];
  const progress = answers[8];
  const low = answers[9];
  const high = answers[10];
  const reflection = answers[11];


  let diary = `${today}\n\n`;

  diary += `Today felt like a ${score >= 75 ? "good" : score >= 50 ? "mixed" : "difficult"} day. `;

  if (morning)
    diary += `${morning} `;

  if (work)
    diary += `\n\nWork brought its own part of the day: ${work} `;

  if (difficulty)
    diary += `\n\nOne of the difficult moments was ${difficulty} `;

  if (people)
    diary += `\n\nThe people around me were part of the story too. ${people} `;

  if (mind)
    diary += `\n\nInside my head, ${mind} `;

  if (body)
    diary += `\n\nPhysically, ${body} `;

  if (personal)
    diary += `\n\nI also gave some time to myself: ${personal} `;

  if (progress)
    diary += `\n\nAs for moving forward, ${progress} `;

  if (low)
    diary += `\n\nThe low point was ${low} `;

  if (high)
    diary += `\n\nBut the best part was ${high} `;

  if (reflection)
    diary += `\n\nLooking back, the simplest way to describe the day is: "${reflection}"`;


  return diary;

}


function saveDay(scores, score, verdict, diary) {

  const history =
    JSON.parse(localStorage.getItem("bearHistory") || "[]");


  const day = {

    id: Date.now(),

    date: new Date().toISOString(),

    answers: answers,

    scores: scores,

    score: Math.round(score),

    verdict: verdict,

    diary: diary

  };


  history.unshift(day);


  localStorage.setItem(
    "bearHistory",
    JSON.stringify(history)
  );

}


function showHistory() {

  const history =
    JSON.parse(localStorage.getItem("bearHistory") || "[]");

  const container =
    document.getElementById("historyList");


  container.innerHTML = "";


  if (history.length === 0) {

    container.innerHTML =
      "<p style='color:#888'>Bear doesn't remember any days yet.</p>";

    showScreen("history");

    return;

  }


  history.forEach(day => {

    const date =
      new Date(day.date).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      });


    const item =
      document.createElement("div");

    item.className = "history-item";

    item.innerHTML = `
      <strong>${day.score}</strong>
      <span>${day.verdict}</span>
      <p>${date}</p>
      <p>${day.diary.substring(0, 180)}...</p>
    `;


    container.appendChild(item);

  });


  showScreen("history");

}


function newDay() {

  answers = [];
  currentQuestion = 0;

  document.getElementById("mood").value = 5;
  document.getElementById("energy").value = 5;
  document.getElementById("productivity").value = 5;
  document.getElementById("mental").value = 5;
  document.getElementById("relationship").value = 5;
  document.getElementById("growth").value = 5;

  document.querySelectorAll(".slider-group span").forEach(el => {
    el.textContent = "5";
  });

  showScreen("intro");

}


setupSliders();
