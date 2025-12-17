jQuery(document).ready(function ($) {

    if (typeof BOOKING_STRICT_RULE === 'undefined' || !BOOKING_STRICT_RULE.enabled) {
        return;
    }

    const pickupModalBody = $('#pickup-modal-body');
    const pickupMobileDatepicker = $('#mobile-datepicker');
    const pickupDateInput = $('#pickup-date');

    const dropoffModalBody = $('#dropoff-modal-body');
    const dropoffMobileDatepicker = $('#drop-mobile-datepicker');
    const dropoffDateInput = $('#dropoff-date');

    const DATE_FORMAT = 'm/d/Y';
    let lastWarningDate = null;

    function parseDate(dateString) {
        if (!dateString) return null;
        let parts = dateString.split(/[/\-\. ]/);
        let month = parseInt(parts[0], 10) - 1;
        let day = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        let date = new Date(year, month, day);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    function formatDate(date) {
        if (!date) return null;
        let d = ('0' + date.getDate()).slice(-2);
        let m = ('0' + (date.getMonth() + 1)).slice(-2);
        let y = date.getFullYear();
        return DATE_FORMAT.replace('d', d).replace('m', m).replace('Y', y);
    }

    function handleMobilePickupDateSelection(selectedDate) {
        const startDateString = formatDate(selectedDate);
        pickupDateInput.val(startDateString);

        if (!startDateString) {
            dropoffDateInput.val('');
            return;
        }

        if (typeof CALENDAR_DATA === 'undefined') {
            return;
        }

        let disabledDates = CALENDAR_DATA.calendar_props.settings.validations.block_dates || [];
        if (typeof wpBookedDates !== 'undefined') {
            disabledDates = disabledDates.concat(wpBookedDates);
        }

        let startDate = parseDate(startDateString);
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
            alert('The next 3 calendar days are not available. Please choose another pickup date.');
            pickupDateInput.val('');
            dropoffDateInput.val('');
            return;
        }

        lastWarningDate = null;
        let returnDate = new Date(startDate);
        returnDate.setDate(startDate.getDate() + 3);
        dropoffDateInput.val(formatDate(returnDate)).trigger('change');
        pickupModalBody.hide();
    }

    function handleMobileReturnDateValidation(selectedDate) {
        const startDateString = pickupDateInput.val();
        const endDateString = formatDate(selectedDate);
        dropoffDateInput.val(endDateString);

        if (!startDateString || !endDateString) {
            return;
        }

        let startDate = parseDate(startDateString);
        let endDate = parseDate(endDateString);

        let diffDays = Math.ceil((endDate - startDate) / (1000 * 3600 * 24));

        if (diffDays < 3) {
            alert('Minimum booking is 4 calendar days.');
            dropoffDateInput.val('');
            return;
        }
        dropoffModalBody.hide();
    }

    // --- Open the pickup modal ---
    pickupDateInput.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        pickupModalBody.show();

        setTimeout(function() {
            if (pickupMobileDatepicker.data('xdsoft_datetimepicker')) {
                pickupMobileDatepicker.datetimepicker({
                    onSelectDate: handleMobilePickupDateSelection
                });
            }
        }, 100);
    });

    // --- Open the dropoff modal ---
    dropoffDateInput.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropoffModalBody.show();

        setTimeout(function() {
            if (dropoffMobileDatepicker.data('xdsoft_datetimepicker')) {
                dropoffMobileDatepicker.datetimepicker({
                    onSelectDate: handleMobileReturnDateValidation
                });
            }
        }, 100);
    });

    // --- Close the modals ---
    $('#cal-close-btn, #drop-cal-close-btn').on('click', function () {
        pickupModalBody.hide();
        dropoffModalBody.hide();
    });
});
