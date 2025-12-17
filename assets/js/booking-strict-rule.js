jQuery(document).ready(function ($) {
  if (typeof BOOKING_STRICT_RULE === "undefined") {
    return;
  }

  let lastWarningDate = null;
  const DATE_FORMAT = "d/m/Y";

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

    for (let i = 1; i <= 3; i++) {
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
        "The next 3 calendar days are not available. Please choose another pickup date."
      );

      $("#pickup-date, #dropoff-date").val("");
      $(".booking-pricing-info").fadeOut();
      return;
    }

    lastWarningDate = null;

    let returnDate = new Date(startDate);
    returnDate.setDate(startDate.getDate() + 3);

    $("#dropoff-date").val(formatDate(returnDate)).trigger("change");
  }

  function handleReturnDateValidation() {
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

    let diffDays = Math.ceil((endDate - startDate) / (1000 * 3600 * 24));

    if (diffDays !== 3) {
      alert("Booking must be for exactly 4 calendar days.");
      $("#dropoff-date").val("");
      $(".booking-pricing-info").hide();
      return;
    }

    $("form.cart").trigger("change");
  }

  $("body").on("change", "#pickup-date", handlePickupDateSelection);
  $("body").on("change", "#dropoff-date", handleReturnDateValidation);
});
