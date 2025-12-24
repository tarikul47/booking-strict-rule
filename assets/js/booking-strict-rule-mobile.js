jQuery(document).ready(function ($) {
  // --- Popup Warning Modal ---
  const popupModal = `
    <div id="booking-warning-popup" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 99999999;">
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: #fff; padding: 20px 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); max-width: 90%; width:90%; text-align: left;">
        <h3 id="booking-warning-title" style="color: red; font-weight: bold; font-size: 20px; margin-top:0; margin-bottom: 15px;"></h3>
        <div id="booking-warning-message-body"></div>
        <button id="booking-warning-close" style="background-color: #2563EB; color: #fff; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; width: 100%; margin-top: 20px; font-weight: bold;">verstanden.</button>
      </div>
    </div>
  `;

  $('body').append(popupModal);

  function showPopupWarning(details) {
    $('#booking-warning-title').text(details.title);
    $('#booking-warning-message-body').html(details.body);
    $('#booking-warning-popup').fadeIn();
  }

  function hidePopupWarning() {
    $('#booking-warning-popup').fadeOut();
  }

  // Close popup when the close button or overlay is clicked
  $('#booking-warning-close, #booking-warning-popup').on('click', function(e) {
    if (e.target.id === 'booking-warning-close' || e.target.id === 'booking-warning-popup') {
        hidePopupWarning();
    }
  });
  // Prevent clicks inside the modal content from closing it
  $('#booking-warning-popup > div').on('click', function(e) {
    e.stopPropagation();
  });


  if (typeof BOOKING_STRICT_RULE === "undefined" || !BOOKING_STRICT_RULE.inventory_rules) {
    return;
  }

  const pickupModalBody = $("#pickup-modal-body");
  const pickupMobileDatepicker = $("#mobile-datepicker");
  const pickupDateInput = $("#pickup-date");

  const dropoffModalBody = $("#dropoff-modal-body");
  const dropoffMobileDatepicker = $("#drop-mobile-datepicker");
  const dropoffDateInput = $("#dropoff-date");

  const DATE_FORMAT = "d/m/Y";
  let lastWarningDate = null;
  let currentBookingDays = null;
  let currentAllowedDays = []; // Added this line

  function updateBookingRule(inventoryId) {
    if (
      BOOKING_STRICT_RULE.inventory_rules &&
      BOOKING_STRICT_RULE.inventory_rules[inventoryId]
    ) {
      currentBookingDays = parseInt(BOOKING_STRICT_RULE.inventory_rules[inventoryId].days, 10);
      currentAllowedDays = BOOKING_STRICT_RULE.inventory_rules[inventoryId].allowed_days || []; // Added this line
    } else {
      currentBookingDays = null; // No strict rule for this inventory
      currentAllowedDays = []; // Added this line
    }
    // Clear dates when the rule changes
    pickupDateInput.val("");
    dropoffDateInput.val("");
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

    if (date.getFullYear() != year || date.getMonth() != month || date.getDate() != day) {
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

  function getDayKeyFromDate(dateObj) {
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    return days[dateObj.getDay()];
  }

  function handleMobilePickupDateSelection(selectedDate) {
    const startDateString = formatDate(selectedDate);
    pickupDateInput.val(startDateString); // Update input field early

    if (!startDateString) {
      dropoffDateInput.val("");
      return;
    }

    let startDate = parseDate(startDateString);
    if (!startDate) {
      return;
    }

    // --- Start: New logic for allowed booking days ---
    if (currentAllowedDays && currentAllowedDays.length > 0) {
      const dayKey = getDayKeyFromDate(startDate);
      if (!currentAllowedDays.includes(dayKey)) {
        const daysMap = {
          saturday: "Samstag",
          sunday: "Sonntag",
          monday: "Montag",
          tuesday: "Dienstag",
          wednesday: "Mittwoch",
          thursday: "Donnerstag",
          friday: "Freitag",
        };

        const selectedDayGerman = daysMap[dayKey] || dayKey;
        const allowedDaysGerman = currentAllowedDays
          .map((day) => daysMap[day] || day)
          .join(", ");

        const warningTitle = "Ungültiger Buchungstag";
        const warningBody = `
          <p style="margin: 0 0 10px 0; font-size: 14px;">Das von Ihnen gewählte Datum (${startDateString}) ist ein ${selectedDayGerman}.</p>
          <p style="margin: 0 0 10px 0; font-size: 14px;">Buchungen sind nur an folgenden Tagen möglich: <strong>${allowedDaysGerman}</strong>.</p>
          <p style="margin: 0; font-size: 14px;">Bitte wählen Sie ein gültiges Datum.</p>
        `;

        showPopupWarning({ title: warningTitle, body: warningBody });

        pickupDateInput.val("");
        dropoffDateInput.val("");
        return;
      }
    }
    // --- End: New logic for allowed booking days ---

    // If no strict rule is active for the current inventory, do nothing.
    if (!currentBookingDays || currentBookingDays <= 0) {
      pickupModalBody.hide();
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
      showPopupWarning({title: warningTitle, body: warningBody});

      pickupDateInput.val("");
      dropoffDateInput.val("");
      return;
    }

    lastWarningDate = null;
    let returnDate = new Date(startDate);
    returnDate.setDate(startDate.getDate() + fixedBookingNights);
    dropoffDateInput.val(formatDate(returnDate)).trigger("change");
    pickupModalBody.hide();
  }

  function handleMobileReturnDateValidation(selectedDate) {
    const endDateString = formatDate(selectedDate);
    dropoffDateInput.val(endDateString);
    
    // If no strict rule is active for the current inventory, do nothing.
    if (!currentBookingDays || currentBookingDays <= 0) {
        dropoffModalBody.hide();
        return;
    }

    const startDateString = pickupDateInput.val();
    if (!startDateString || !endDateString) {
      return;
    }

    let startDate = parseDate(startDateString);
    let endDate = parseDate(endDateString);

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
            <strong>Ausgewähltes Rückreisedatume:</strong> ${endDateString}
        </div>
        <p style="margin: 0 0 10px 0; font-size: 14px;">Sie müssen genau ${currentBookingDays} aufeinanderfolgende Tage buchen. Ihre aktuelle Auswahl umfasst nur ${selectedDays} Tage.</p>
        <p style="margin: 0; font-size: 14px;">Bitte wählen Sie ein Rückgabedatum, das genau ${currentBookingDays} Tage nach dem Abholdatum liegt.</p>
      `;
      showPopupWarning({title: warningTitle, body: warningBody});
      
      dropoffDateInput.val("");
      return;
    }
    dropoffModalBody.hide();
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

  // --- Open the pickup modal ---
  pickupDateInput.on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    pickupModalBody.show();

    setTimeout(function () {
      if (pickupMobileDatepicker.data("xdsoft_datetimepicker")) {
        pickupMobileDatepicker.datetimepicker({
          onSelectDate: handleMobilePickupDateSelection,
        });
      }
    }, 100);
  });

  // --- Open the dropoff modal ---
  dropoffDateInput.on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropoffModalBody.show();

    setTimeout(function () {
      if (dropoffMobileDatepicker.data("xdsoft_datetimepicker")) {
        dropoffMobileDatepicker.datetimepicker({
          onSelectDate: handleMobileReturnDateValidation,
        });
      }
    }, 100);
  });

  // --- Close the modals ---
  $("#cal-close-btn, #drop-cal-close-btn").on("click", function () {
    pickupModalBody.hide();
    dropoffModalBody.hide();
  });
});
