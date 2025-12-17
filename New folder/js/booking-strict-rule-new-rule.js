jQuery(document).ready(function ($) {
  if (
    typeof BOOKING_STRICT_RULE === "undefined" ||
    !BOOKING_STRICT_RULE.inventory_rules
  ) {
    return;
  }

  console.log("running");
  console.log(BOOKING_STRICT_RULE);

  let lastWarningDate = null;
  let activeRuleDays = 0;
  const DATE_FORMAT = "m/d/Y";

  function parseDate(dateString) {
    let parts = dateString.split(/[/\-\. ]/);
    let month = parseInt(parts[0], 10) - 1;
    let day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    let date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function formatDate(date) {
    let d = ("0" + date.getDate()).slice(-2);
    let m = ("0" + (date.getMonth() + 1)).slice(-2);
    let y = date.getFullYear();
    return DATE_FORMAT.replace("d", d).replace("m", m).replace("Y", y);
  }

  function handlePickupDateSelection() {
    if (activeRuleDays === 0) return;
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
    let isAvailable = true;
    const daysToCheck = activeRuleDays - 1;

    for (let i = 1; i <= daysToCheck; i++) {
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
        `The next ${daysToCheck} calendar days are not available. Please choose another pickup date.`
      );
      $("#pickup-date, #dropoff-date").val("");
      $(".booking-pricing-info").fadeOut();
      return;
    }

    lastWarningDate = null;
    let returnDate = new Date(startDate);
    returnDate.setDate(startDate.getDate() + daysToCheck);
    $("#dropoff-date").val(formatDate(returnDate)).trigger("change");
  }

  function handleReturnDateValidation() {
    if (activeRuleDays === 0) return;

    let start = $("#pickup-date").val();
    let end = $("#dropoff-date").val();
    if (!start || !end) return;

    let startDate = parseDate(start);
    let endDate = parseDate(end);
    let diffDays = Math.ceil((endDate - startDate) / (1000 * 3600 * 24));

    const minDiff = activeRuleDays - 1;

    if (diffDays < minDiff) {
      alert(`Minimum booking is ${activeRuleDays} calendar days.`);
      $("#dropoff-date").val("");
      $(".booking-pricing-info").hide();
      return;
    }

    $("form.cart").trigger("change");
  }

  function initializeInventoryRule(inventoryId) {
    if (BOOKING_STRICT_RULE.inventory_rules[inventoryId]) {
      activeRuleDays = parseInt(
        BOOKING_STRICT_RULE.inventory_rules[inventoryId].days,
        10
      );

      // Unbind previous listeners to prevent duplicates
      $("body").off("change", "#pickup-date", handlePickupDateSelection);
      $("body").off("change", "#dropoff-date", handleReturnDateValidation);

      // Bind new listeners
      $("body").on("change", "#pickup-date", handlePickupDateSelection);
      $("body").on("change", "#dropoff-date", handleReturnDateValidation);
    } else {
    //  activeRuleDays = 0;
      // Unbind listeners if no rule is active
    //  $("body").off("change", "#pickup-date", handlePickupDateSelection);
    //  $("body").off("change", "#dropoff-date", handleReturnDateValidation);
    }
  }

  // Listen for change on the inventory dropdown
  $("#booking_inventory").on("change", function () {
    const selectedInventoryId = $(this).val();
    console.log("selectedInventoryId", selectedInventoryId);

    initializeInventoryRule(selectedInventoryId);
  });

  // Initial check in case an inventory is pre-selected
  const initialInventoryId = $("#booking_inventory").val();
  if (initialInventoryId) {
    initializeInventoryRule(initialInventoryId);
  }
});
