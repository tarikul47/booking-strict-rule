<?php
/**
 * Plugin Name: Booking Strict Rule
 * Description: Enforces a strict 4-day booking rule for selected RedQ rental products.
 * Version: 1.0.0
 * Author: Tarikul Islam
 * Text Domain: booking-strict-rule
 */

if (!defined('ABSPATH')) {
    exit;
}

class Booking_Strict_Rule
{

    const META_KEY = '_redq_custom_checkbox';
    const DAYS_META_KEY = '_booking_strict_rule_days';
    const DAYS_ALLOWED_META_KEY = '_booking_strict_rule_allowed_days';


    public function __construct()
    {
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts'], 100);

        if (is_admin()) {
            add_action('add_meta_boxes', [$this, 'add_metabox']);
            add_action('save_post_inventory', [$this, 'save_metabox']);
        }
    }

    /**
     * Enqueue frontend JS only when conditions match
     */
    public function enqueue_scripts()
    {
        if (!is_product()) {
            return;
        }

        global $post;
        if (!$post) {
            return;
        }

        $product = wc_get_product($post->ID);
        if (!$product || !$product->is_type('redq_rental')) {
            return;
        }

        $inventory_ids = get_post_meta($post->ID, '_redq_product_inventory', true);
        if (empty($inventory_ids) || !is_array($inventory_ids)) {
            return;
        }

        $inventory_rules = [];
        // The meta value is an array within an array, so we need the first element.
        $inventory_id_list = isset($inventory_ids) ? $inventory_ids : [];

        foreach ($inventory_id_list as $inventory_id) {
            $is_enabled = get_post_meta($inventory_id, self::META_KEY, true);
            if ($is_enabled === 'yes') {
                $days = get_post_meta($inventory_id, self::DAYS_META_KEY, true);
                $allowed_days = get_post_meta($inventory_id,self::DAYS_ALLOWED_META_KEY, true);

                if (!is_array($allowed_days)) {
                    $allowed_days = [];
                }

                $inventory_rules[$inventory_id] = [
                    'days' => intval($days),
                    'allowed_days' => array_values($allowed_days),
                ];
            }
        }

        if (empty($inventory_rules)) {
            return;
        }

        $booking_data = [
            'inventory_rules' => $inventory_rules,
        ];

        //print_r($booking_data);

        $script_handle = 'booking-strict-rule';
        $script_url = plugin_dir_url(__FILE__) . 'assets/js/booking-strict-rule.js';

        if (wp_is_mobile()) {
            $script_handle = 'booking-strict-rule-mobile';
            $script_url = plugin_dir_url(__FILE__) . 'assets/js/booking-strict-rule-mobile.js';
        }

        $script_path = plugin_dir_path(__FILE__) . str_replace(plugin_dir_url(__FILE__), '', $script_url);
        $version = file_exists($script_path) ? filemtime($script_path) : '1.0.0';

        wp_enqueue_script(
            $script_handle,
            $script_url,
            ['jquery', 'front-end-scripts'],
            $version,
            true
        );

        wp_localize_script($script_handle, 'BOOKING_STRICT_RULE', $booking_data);
    }

    /**
     * Add product metabox
     */
    public function add_metabox()
    {
        add_meta_box(
            'booking_strict_rule_metabox',
            __('Booking Strict Rule', 'booking-strict-rule'),
            [$this, 'render_metabox'],
            'inventory',
            'side',
            'default'
        );
    }

    /**
     * Render metabox content
     */
    public function render_metabox($post)
    {
        wp_nonce_field('booking_strict_rule_save', 'booking_strict_rule_nonce');

        $is_enabled = get_post_meta($post->ID, self::META_KEY, true);
        $rule_days = get_post_meta($post->ID, self::DAYS_META_KEY, true);

        $saved_days = get_post_meta($post->ID, self::DAYS_ALLOWED_META_KEY, true);
        if (!is_array($saved_days)) {
            $saved_days = [];
        }

        $days = [
            'saturday' => 'Saturday',
            'sunday' => 'Sunday',
            'monday' => 'Monday',
            'tuesday' => 'Tuesday',
            'wednesday' => 'Wednesday',
            'thursday' => 'Thursday',
            'friday' => 'Friday',
        ];
        ?>

        <!-- Strict Rule Toggle -->
        <div style="margin-bottom:10px;">
            <label style="font-weight:600;">
                <input type="checkbox" name="booking_strict_rule" value="yes" <?php checked($is_enabled, 'yes'); ?> />
                <?php esc_html_e('Enable Strict Booking Rule', 'booking-strict-rule'); ?>
            </label>
        </div>

        <!-- Number of Days -->
        <div style="margin-bottom:15px;">
            <label for="booking_strict_rule_days" style="display:block;font-weight:600;margin-bottom:4px;">
                <?php esc_html_e('Advance Booking Days', 'booking-strict-rule'); ?>
            </label>
            <input type="number" id="booking_strict_rule_days" name="booking_strict_rule_days"
                value="<?php echo esc_attr($rule_days); ?>" min="1" style="width:100%;" />
            <small style="color:#666;">How many days before booking is allowed</small>
        </div>

        <hr style="margin:12px 0;">

        <!-- Allowed Days -->
        <div>
            <strong><?php esc_html_e('Allowed Booking Days', 'booking-strict-rule'); ?></strong>
            <small style="display:block;color:#666;margin-bottom:8px;">
                Select maximum 3 days
            </small>

            <div id="booking-strict-days-wrapper" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                <?php foreach ($days as $key => $label): ?>
                    <label style="display:flex;align-items:center;gap:6px;">
                        <input type="checkbox" class="booking-strict-day" name="booking_strict_days[]"
                            value="<?php echo esc_attr($key); ?>" <?php checked(in_array($key, $saved_days)); ?>>
                        <?php echo esc_html($label); ?>
                    </label>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- UX Script -->
        <script>
            (function ($) {
                function updateDayLimit() {
                    const max = 3;
                    const checkedCount = $('.booking-strict-day:checked').length;

                    $('.booking-strict-day').each(function () {
                        if (!this.checked) {
                            $(this).prop('disabled', checkedCount >= max);
                        }
                    });
                }

                $(document).on('change', '.booking-strict-day', updateDayLimit);
                $(document).ready(updateDayLimit);
            })(jQuery);
        </script>

        <?php
    }


    /**
     * Save metabox data
     */
    public function save_metabox($post_id)
    {

        if (
            !isset($_POST['booking_strict_rule_nonce']) ||
            !wp_verify_nonce($_POST['booking_strict_rule_nonce'], 'booking_strict_rule_save')
        ) {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        $is_enabled = isset($_POST['booking_strict_rule']) ? 'yes' : 'no';
        update_post_meta($post_id, self::META_KEY, $is_enabled);

        if (isset($_POST['booking_strict_rule_days'])) {
            $days = intval($_POST['booking_strict_rule_days']);
            update_post_meta($post_id, self::DAYS_META_KEY, $days);
        }

        if (isset($_POST['booking_strict_days']) && is_array($_POST['booking_strict_days'])) {
            $days = array_slice(array_map('sanitize_text_field', $_POST['booking_strict_days']), 0, 3);
            update_post_meta($post_id, self::DAYS_ALLOWED_META_KEY, $days);
        } else {
            delete_post_meta($post_id, self::DAYS_ALLOWED_META_KEY);
        }

    }
}

// Initialize plugin
new Booking_Strict_Rule();
