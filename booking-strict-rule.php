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
                $inventory_rules[$inventory_id] = [
                    'days' => intval($days),
                ];
            }
        }

        if (empty($inventory_rules)) {
            return;
        }

        $booking_data = [
            'inventory_rules' => $inventory_rules,
        ];

        print_r($booking_data);

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
        $days = get_post_meta($post->ID, self::DAYS_META_KEY, true);
        ?>
        <p>
            <label>
                <input type="checkbox" name="booking_strict_rule" value="yes" <?php checked($is_enabled, 'yes'); ?> />
                <?php esc_html_e('Enable Strict Booking Rule', 'booking-strict-rule'); ?>
            </label>
        </p>
        <p>
            <label for="booking_strict_rule_days"><?php esc_html_e('Number of Days:', 'booking-strict-rule'); ?></label>
            <input type="number" id="booking_strict_rule_days" name="booking_strict_rule_days" value="<?php echo esc_attr($days); ?>" min="1" />
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

        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        $is_enabled = isset($_POST['booking_strict_rule']) ? 'yes' : 'no';
        update_post_meta($post_id, self::META_KEY, $is_enabled);

        if (isset($_POST['booking_strict_rule_days'])) {
            $days = intval($_POST['booking_strict_rule_days']);
            update_post_meta($post_id, self::DAYS_META_KEY, $days);
        }
    }
}

// Initialize plugin
new Booking_Strict_Rule();
