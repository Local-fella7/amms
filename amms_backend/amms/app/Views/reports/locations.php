<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <?= $this->include('reports/partials/styles') ?>
</head>
<body>
    <?= $this->include('reports/partials/header') ?>

    <?php foreach ($locations as $location): ?>
        <h2><?= esc($location['label']) ?> (<?= (int) $location['count'] ?>)</h2>
        <?php if (empty($location['members'])): ?>
            <div class="empty">No members in this location.</div>
        <?php else: ?>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Gender</th>
                        <th>Age Group</th>
                        <th>Status</th>
                        <th>Phone</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($location['members'] as $member): ?>
                        <tr>
                            <td><?= esc(trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''))) ?></td>
                            <td><?= esc(ucfirst($member['gender'] ?? '')) ?></td>
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
