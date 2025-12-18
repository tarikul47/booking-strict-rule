jQuery(document).ready(function ($) {
  // --- Popup Warning Modal ---
  const popupModal = `
    <div id="booking-warning-popup" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 10000;">
      <div style="max-width:45%;position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: #fff; padding: 20px 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); min-width: 400px; text-align: left;">
        <h3 id="booking-warning-title" style="color: red; font-weight: bold; font-size: 20px; margin-top:0; margin-bottom: 15px;"></h3>
        <div id="booking-warning-message-body"></div>
        <button id="booking-warning-close" style="background-color: #2563EB; color: #fff; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; width: 100%; margin-top: 20px; font-weight: bold;">Okay, verstanden.</button>
      </div>
    </div>
  `;

  $("body").append(popupModal);

  function showPopupWarning(details) {
    $("#booking-warning-title").text(details.title);
    $("#booking-warning-message-body").html(details.body);
    $("#booking-warning-popup").fadeIn();
  }

  function hidePopupWarning() {
    $("#booking-warning-popup").fadeOut();
  }

  // Close popup when the close button or overlay is clicked
  $("#booking-warning-close, #booking-warning-popup").on("click", function (e) {
    if (
      e.target.id === "booking-warning-close" ||
      e.target.id === "booking-warning-popup"
    ) {
      hidePopupWarning();
    }
  });
  // Prevent clicks inside the modal content from closing it
  $("#booking-warning-popup > div").on("click", function (e) {
    e.stopPropagation();
  });

  if (
    typeof BOOKING_STRICT_RULE === "undefined" ||
    !BOOKING_STRICT_RULE.inventory_rules
  ) {
    return;
  }

  let lastWarningDate = null;
  let currentBookingDays = null;
  const DATE_FORMAT = "d/m/Y";

  function updateBookingRule(inventoryId) {
    if (
      BOOKING_STRICT_RULE.inventory_rules &&
      BOOKING_STRICT_RULE.inventory_rules[inventoryId]
    ) {
      currentBookingDays = parseInt(
        BOOKING_STRICT_RULE.inventory_rules[inventoryId].days,
        10
      );
    } else {
      currentBookingDays = null; // No strict rule for this inventory
    }
    // Clear dates when the rule changes
    $("#pickup-date, #dropoff-date").val("");
    $(".booking-pricing-info").fadeOut();
  }

  function parseDate(dateString) {
    if (!dateString) return null;
    let parts = dateString.split(/[/\-\. ]/);
    if (parts.length < 3) return null;

    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return null;
    }

    let date = new Date(year, month, day);

    if (
      date.getFullYear() != year ||
      date.getMonth() != month ||
      date.getDate() != day
    ) {
      return null;
    }

    date.setHours(0, 0, 0, 0);
    return date;
  }

  function formatDate(date) {
    if (!date) return "";
    let d = ("0" + date.getDate()).slice(-2);
    let m = ("0" + (date.getMonth() + 1)).slice(-2);
    let y = date.getFullYear();
    return DATE_FORMAT.replace("d", d).replace("m", m).replace("Y", y);
  }

  function handlePickupDateSelection() {
    // If no strict rule is active for the current inventory, do nothing.
    if (!currentBookingDays || currentBookingDays <= 0) {
      return;
    }

    let startDateString = $("#pickup-date").val();

    if (!startDateString) {
      $("#dropoff-date").val("");
      $(".booking-pricing-info").fadeOut();
      return;
    }

    if (typeof CALENDAR_DATA === "undefined") {
      return;
    }

    let disabledDates =
      CALENDAR_DATA.calendar_props.settings.validations.block_dates || [];

    if (typeof wpBookedDates !== "undefined") {
      disabledDates = disabledDates.concat(wpBookedDates);
    }

    let startDate = parseDate(startDateString);
    if (!startDate) {
      return;
    }
    let isAvailable = true;
    const fixedBookingNights = currentBookingDays - 1;

    for (let i = 1; i <= fixedBookingNights; i++) {
      let nextDate = new Date(startDate);
      nextDate.setDate(startDate.getDate() + i);

      if (disabledDates.includes(formatDate(nextDate))) {
        isAvailable = false;
        break;
      }
    }

    if (!isAvailable) {
      if (startDateString === lastWarningDate) return;

      lastWarningDate = startDateString;

      const warningTitle = "Datum nicht verfügbar";
      const warningBody = `
        <div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
            <strong>Ausgewähltes Datum:</strong> ${startDateString}
        </div>
        <p style="margin: 0 0 10px 0; font-size: 14px;">Dieses Abholdatum kann nicht ausgewählt werden, da keine nachfolgenden Termine verfügbar sind, die die Erfüllung der Mindestanforderung von ${currentBookingDays} aufeinanderfolgenden Tagen verhindern.</p>
        <p style="margin: 0; font-size: 14px;">Bitte wählen Sie ein anderes Abholdatum, das ${currentBookingDays} aufeinanderfolgende verfügbare Tage ermöglicht.</p>
      `;

      showPopupWarning({ title: warningTitle, body: warningBody });

      $("#pickup-date, #dropoff-date").val("");
      $(".booking-pricing-info").fadeOut();
      return;
    }

    lastWarningDate = null;

    let returnDate = new Date(startDate);
    returnDate.setDate(startDate.getDate() + fixedBookingNights);

    $("#dropoff-date").val(formatDate(returnDate)).trigger("change");
  }

  function handleReturnDateValidation() {
    // If no strict rule is active for the current inventory, do nothing.
    if (!currentBookingDays || currentBookingDays <= 0) {
      return;
    }

    let start = $("#pickup-date").val();
    let end = $("#dropoff-date").val();

    if (!start || !end) {
      return;
    }

    let startDate = parseDate(start);
    let endDate = parseDate(end);

    if (!startDate || !endDate) {
      return;
    }

    const fixedBookingNights = currentBookingDays - 1;
    let diffDays = Math.ceil((endDate - startDate) / (1000 * 3600 * 24));

    if (diffDays !== fixedBookingNights) {
      const selectedDays = diffDays < 0 ? 0 : diffDays + 1;
      const warningTitle = "Datum nicht verfügbar";
      const warningBody = `
        <div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
            <strong>Ausgewähltes Rückreisedatum:</strong> ${end}
        </div>
        <p style="margin: 0 0 10px 0; font-size: 14px;">Sie müssen genau ${currentBookingDays} aufeinanderfolgende Tage buchen. Ihre aktuelle Auswahl umfasst nur ${selectedDays} Tage.</p>
        <p style="margin: 0; font-size: 14px;">Bitte wählen Sie ein Rückgabedatum, das genau ${currentBookingDays} Tage nach dem Abholdatum liegt.</p>
      `;
      showPopupWarning({ title: warningTitle, body: warningBody });

      $("#dropoff-date").val("");
      $(".booking-pricing-info").hide();
      return;
    }

    $("form.cart").trigger("change");
  }

  // --- Initialize and add event listeners ---

  // Listen for change on the inventory dropdown
  $("#booking_inventory").on("change", function () {
    const selectedInventoryId = $(this).val();
    updateBookingRule(selectedInventoryId);
  });

  // Set the rule for the initially selected inventory on page load
  const initialInventoryId = $("#booking_inventory").val();
  if (initialInventoryId) {
    updateBookingRule(initialInventoryId);
  }

  $("body").on("change", "#pickup-date", handlePickupDateSelection);
  $("body").on("change", "#dropoff-date", handleReturnDateValidation);
});
