jQuery(document).ready(function ($) {
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

  function updateBookingRule(inventoryId) {
    if (
      BOOKING_STRICT_RULE.inventory_rules &&
      BOOKING_STRICT_RULE.inventory_rules[inventoryId]
    ) {
      currentBookingDays = parseInt(BOOKING_STRICT_RULE.inventory_rules[inventoryId].days, 10);
    } else {
      currentBookingDays = null; // No strict rule for this inventory
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

  function handleMobilePickupDateSelection(selectedDate) {
    // If no strict rule is active for the current inventory, do nothing.
    if (!currentBookingDays || currentBookingDays <= 0) {
      pickupDateInput.val(formatDate(selectedDate));
      pickupModalBody.hide();
      return;
    }

    const startDateString = formatDate(selectedDate);
    pickupDateInput.val(startDateString);

    if (!startDateString) {
      dropoffDateInput.val("");
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
      alert(
        "The next " + fixedBookingNights + " calendar days are not available. Please choose another pickup date."
      );
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
      alert("Booking must be for exactly " + currentBookingDays + " calendar days.");
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
