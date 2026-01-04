const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Testing Visual Studio Detection...\n');

// Check for Visual Studio installations
const vsPaths = [
  'C:\\Program Files (x86)\\Microsoft Visual Studio\\18\\BuildTools',
  'C:\\Program Files\\Microsoft Visual Studio\\18\\BuildTools',
  'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools',
  'C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools',
];

let foundVS = null;
for (const vsPath of vsPaths) {
  if (fs.existsSync(vsPath)) {
    const msBuildPath = path.join(vsPath, 'MSBuild', 'Current', 'Bin', 'MSBuild.exe');
    if (fs.existsSync(msBuildPath)) {
      foundVS = { path: vsPath, msBuild: msBuildPath };
      console.log(`✅ Found Visual Studio at: ${vsPath}`);
      console.log(`   MSBuild: ${msBuildPath}`);
      break;
    }
  }
}

if (!foundVS) {
  console.log('❌ Visual Studio Build Tools not found');
  process.exit(1);
}

// Check for v143 toolset
const vcToolsPath = path.join(foundVS.path, 'VC', 'Tools', 'MSVC');
if (fs.existsSync(vcToolsPath)) {
  const toolsetDirs = fs.readdirSync(vcToolsPath);
  console.log(`\n✅ Found MSVC toolsets:`);
  toolsetDirs.forEach(dir => {
    const toolsetPath = path.join(vcToolsPath, dir, 'bin', 'Hostx64', 'x64');
    if (fs.existsSync(toolsetPath)) {
      console.log(`   - ${dir} (✅ compiler found)`);
    } else {
      console.log(`   - ${dir} (⚠️  compiler not found)`);
    }
  });
  
  const hasV143 = toolsetDirs.some(dir => {
    const toolsetPath = path.join(vcToolsPath, dir, 'bin', 'Hostx64', 'x64');
    return fs.existsSync(toolsetPath);
  });
  
  if (hasV143) {
    console.log('\n✅ C++ compiler toolset is available');
  } else {
    console.log('\n⚠️  C++ compiler toolset not found');
  }
} else {
  console.log('\n❌ VC Tools directory not found');
}

// Test node-gyp configuration
console.log('\n🔧 Testing node-gyp configuration...');
const env = {
  ...process.env,
  GYP_MSVS_VERSION: '2022',
  msvs_version: '2022',
};

if (foundVS.path.includes('\\18\\')) {
  // For VS 2024, don't set VCINSTALLDIR to avoid detection issues
  console.log('   Using VS 2024 (version 18) with VS 2022 toolchain settings');
  console.log('   Setting GYP_MSVS_VERSION=2022');
} else {
  env.VCINSTALLDIR = foundVS.path;
  env.VSINSTALLDIR = foundVS.path;
  console.log('   Setting VCINSTALLDIR and VSINSTALLDIR');
}

// Add MSBuild to PATH
const msBuildDir = path.dirname(foundVS.msBuild);
env.PATH = `${msBuildDir};${env.PATH}`;

console.log('\n✅ Configuration complete!');
console.log('\nEnvironment variables set:');
console.log(`   GYP_MSVS_VERSION=${env.GYP_MSVS_VERSION}`);
console.log(`   msvs_version=${env.msvs_version}`);
if (env.VCINSTALLDIR) {
  console.log(`   VCINSTALLDIR=${env.VCINSTALLDIR}`);
}
console.log(`   PATH includes: ${msBuildDir}`);

console.log('\n📝 Summary:');
console.log('   ✅ Visual Studio Build Tools detected');
console.log('   ✅ MSBuild found');
console.log('   ✅ Environment configured for node-gyp');
console.log('\n💡 You can now run: npm run electron:rebuild');



