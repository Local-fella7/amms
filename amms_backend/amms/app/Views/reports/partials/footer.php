<?php if (! empty($showContacts) && ! empty($association)): ?>
<div class="footer">
    <strong>Association Contacts</strong>
    <div class="contacts">
        <div class="contact-item">
            <strong>Chairman</strong><br>
            <?= esc($association['chairman_phone'] ?? 'N/A') ?>
        </div>
        <div class="contact-item">
            <strong>Treasurer</strong><br>
            <?= esc($association['treasurer_phone'] ?? 'N/A') ?>
        </div>
        <div class="contact-item">
            <strong>Secretary</strong><br>
            <?= esc($association['secretary_phone'] ?? 'N/A') ?>
        </div>
    </div>
</div>
<?php endif; ?>
