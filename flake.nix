{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    systems.url = "github:nix-systems/default";
    flake-utils = {
      url = "github:numtide/flake-utils";
      inputs.systems.follows = "systems";
    };
  };

  outputs =
    { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells = {
          # Packages required for developing this project
          "dev" = pkgs.mkShell {
            packages = [
              pkgs.jinja-lsp
              pkgs.rust-analyzer
              pkgs.rustfmt
              pkgs.typescript-language-server
              pkgs.vscode-langservers-extracted

              pkgs.cargo
              pkgs.rustc

              pkgs.esbuild
              pkgs.minify
              pkgs.upx

              pkgs.lld

              # pkgs.biome
              # pkgs.chromium
              # pkgs.oha
              # pkgs.cargo-expand
              # pkgs.cargo-flamegraph
              # pkgs.tokio-console
            ];
          };

          # Packages required to build this project
          "build" = pkgs.mkShell {
            packages = [
              pkgs.cargo
              pkgs.rustc

              pkgs.esbuild
              pkgs.minify
              pkgs.upx

              pkgs.lld
            ];
          };

        };
      }
    );
}
