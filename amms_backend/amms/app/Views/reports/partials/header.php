<div class="header">
    <?php if (! empty($association['logo']) && is_file(FCPATH . ltrim($association['logo'], '/'))): ?>
        <img src="<?= esc(FCPATH . ltrim($association['logo'], '/')) ?>" alt="Logo" style="height: 48px; margin-bottom: 6px;">
    <?php endif; ?>
    <div class="association-name"><?= esc($association['name'] ?? 'Association') ?></div>
    <?php if (! empty($association['address'])): ?>
        <div><?= esc($association['address']) ?></div>
    <?php endif; ?>
    <h1><?= esc($title) ?></h1>
    <div class="meta">Generated: <?= esc($generatedAt) ?></div>
</div>
