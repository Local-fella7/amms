<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <?= $this->include('reports/partials/styles') ?>
</head>
<body>
    <?= $this->include('reports/partials/header') ?>

    <div class="summary">Total members: <?= count($members) ?></div>

    <?php if (empty($members)): ?>
        <div class="empty">No members found.</div>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Gender</th>
                    <th>Location</th>
                    <th>Age Group</th>
                    <th>Status</th>
                    <th>Phone</th>
                    <th>Registered</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($members as $index => $member): ?>
                    <tr>
                        <td><?= $index + 1 ?></td>
                        <td><?= esc(trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''))) ?></td>
                        <td><?= esc(ucfirst($member['gender'] ?? '')) ?></td>
                        <td><?= esc($member['location_name'] ?? 'Unassigned') ?></td>
                        <td><?= esc($member['age_group_name'] ?? 'Unassigned') ?></td>
                        <td><?= esc(ucfirst($member['member_status'] ?? '')) ?></td>
                        <td><?= esc($member['phone'] ?? '') ?></td>
                        <td><?= esc($member['registration_date'] ?? '') ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>

    <?= $this->include('reports/partials/footer') ?>
</body>
</html>
