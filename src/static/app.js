document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select (keep the default placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML (bulleted list) or show a friendly message
        const participantsHtml = details.participants && details.participants.length
          ? `<ul class="participants-list">${details.participants.map(p => `<li class="participant-item"><span class="participant-email">${p}</span><button class="delete-btn" data-activity="${name}" data-email="${p}">✖</button></li>`).join("")}</ul>`
          : `<p class="no-participants">No participants yet</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability" data-activity="${name}"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <h5>Participants</h5>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add delete button handlers for participants (confirmation + optimistic UI)
        const deleteButtons = activityCard.querySelectorAll(".delete-btn");
        deleteButtons.forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            const activityName = btn.dataset.activity;
            const email = btn.dataset.email;

            // Confirm deletion
            const confirmed = window.confirm(`Remove ${email} from ${activityName}?`);
            if (!confirmed) return;

            // Find the participant list item and availability element
            const li = btn.closest(".participant-item");
            const participantsList = li && li.parentElement;
            const availabilityP = activityCard.querySelector('.availability');

            // Backup for rollback
            const liBackup = li ? li.cloneNode(true) : null;
            const oldSpotsText = availabilityP ? availabilityP.textContent : null;

            // Optimistically remove from DOM and update spots
            if (li && participantsList) {
              li.remove();
            }
            if (availabilityP) {
              // parse current spots number and decrement
              const match = availabilityP.textContent.match(/(\d+) spots left/);
              if (match) {
                const current = parseInt(match[1], 10);
                availabilityP.innerHTML = `<strong>Availability:</strong> ${Math.max(0, current + 1)} spots left`;
              }
            }

            // Send delete request
            try {
              const resp = await fetch(
                `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
                { method: "DELETE" }
              );

              const result = await resp.json().catch(() => ({}));

              if (resp.ok) {
                messageDiv.textContent = result.message || "Participant removed";
                messageDiv.className = "success";
                messageDiv.classList.remove("hidden");
              } else {
                // Rollback UI
                if (liBackup && participantsList) participantsList.appendChild(liBackup);
                if (availabilityP && oldSpotsText) availabilityP.textContent = oldSpotsText;
                messageDiv.textContent = result.detail || "Failed to remove participant";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
              }

              setTimeout(() => {
                messageDiv.classList.add("hidden");
              }, 4000);
            } catch (err) {
              // Rollback UI on network error
              console.error("Error removing participant:", err);
              if (liBackup && participantsList) participantsList.appendChild(liBackup);
              if (availabilityP && oldSpotsText) availabilityP.textContent = oldSpotsText;
              messageDiv.textContent = "Failed to remove participant. Try again.";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities so participants and availability update immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
