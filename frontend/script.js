async function analyzeData() {
  const submitButton = document.getElementById("submit-button");
  const statusNode = document.getElementById("status");
  const responseNode = document.getElementById("responseOutput");

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Analyzing...";
    setStatus(statusNode, "Submitting payload...", false);

    const inputText = document.getElementById("jsonInput").value;
    const jsonData = JSON.parse(inputText);

    const response = await fetch("http://localhost:3000/bfhl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Request failed.");
    }

    responseNode.textContent = JSON.stringify(result, null, 2);
    setStatus(statusNode, "Analysis completed successfully.", false);
  } catch (error) {
    responseNode.textContent = "Error: " + error.message;
    setStatus(statusNode, "Unable to process the request.", true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Analyze";
  }
}

function setStatus(statusNode, message, isError) {
  statusNode.textContent = message;
  statusNode.classList.toggle("error", isError);
}

window.analyzeData = analyzeData;
