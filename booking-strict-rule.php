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

    public function __construct()
    {
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts'], 100);

        if (is_admin()) {
            add_action('add_meta_boxes', [$this, 'add_metabox']);
            add_action('save_post_product', [$this, 'save_metabox']);
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

        $enabled = get_post_meta($post->ID, self::META_KEY, true);

        if ($enabled !== 'yes') {
            return;
        }

        $booking_data = [
            'enabled' => true,
        ];

        if (wp_is_mobile()) {
            $script_path = plugin_dir_path(__FILE__) . 'assets/js/booking-strict-rule-mobile.js';
            $version = file_exists($script_path) ? filemtime($script_path) : '1.0.0';

            wp_enqueue_script(
                'booking-strict-rule-mobile',
                plugin_dir_url(__FILE__) . 'assets/js/booking-strict-rule-mobile.js',
                ['jquery', 'front-end-scripts'],
                $version,
                true
            );
            wp_localize_script('booking-strict-rule-mobile', 'BOOKING_STRICT_RULE', $booking_data);
        } else {
            $script_path = plugin_dir_path(__FILE__) . 'assets/js/booking-strict-rule.js';
            $version = file_exists($script_path) ? filemtime($script_path) : '1.0.0';

            wp_enqueue_script(
                'booking-strict-rule',
                plugin_dir_url(__FILE__) . 'assets/js/booking-strict-rule.js',
                ['jquery', 'front-end-scripts'],
                $version,
                true
            );
            wp_localize_script('booking-strict-rule', 'BOOKING_STRICT_RULE', $booking_data);
        }
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
            'product',
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

        $value = get_post_meta($post->ID, self::META_KEY, true);
        ?>
        <p>
            <label>
                <input type="checkbox" name="booking_strict_rule" value="yes" <?php checked($value, 'yes'); ?> />
                <?php esc_html_e('Enable 4-Day Booking Rule', 'booking-strict-rule'); ?>
            </label>
        </p>
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

        if (!current_user_can('edit_product', $post_id)) {
            return;
        }

        $value = isset($_POST['booking_strict_rule']) ? 'yes' : 'no';
        update_post_meta($post_id, self::META_KEY, $value);
    }
}

// Initialize plugin
new Booking_Strict_Rule();
