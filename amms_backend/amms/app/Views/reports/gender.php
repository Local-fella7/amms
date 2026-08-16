<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <?= $this->include('reports/partials/styles') ?>
</head>
<body>
    <?= $this->include('reports/partials/header') ?>

    <?php foreach ($groups as $group): ?>
        <h2><?= esc($group['label']) ?> (<?= (int) $group['count'] ?>)</h2>
        <?php if (empty($group['members'])): ?>
            <div class="empty">No members found.</div>
        <?php else: ?>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Location</th>
                        <th>Age Group</th>
                        <th>Status</th>
                        <th>Phone</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($group['members'] as $member): ?>
                        <tr>
                            <td><?= esc(trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''))) ?></td>
                            <td><?= esc($member['location_name'] ?? 'Unassigned') ?></td>
                            <td><?= esc($member['age_group_name'] ?? 'Unassigned') ?></td>
                            <td><?= esc(ucfirst($member['member_status'] ?? '')) ?></td>
                            <td><?= esc($member['phone'] ?? '') ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>
    <?php endforeach; ?>

    <?= $this->include('reports/partials/footer') ?>
</body>
</html>
